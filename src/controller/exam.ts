import md5 from 'blueimp-md5';
import chalk from 'chalk';
import * as pup from 'puppeteer-core';
import { examPaper, getAnswer, postAnswer } from '../apis';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import shared from '../shared';
import { getHighlightHTML } from '../utils/html';
import { StudyParams } from '../utils/job';
import { createRandomPath, createRandomPoint } from '../utils/random';
import {
  getBatchText,
  getBounds,
  getCookieIncludesDomain,
  getCount,
  getText,
  sleep,
  stringfyCookie,
} from '../utils/utils';

/**
 * @description 练习测试
 * @param type
 * @returns
 */
const handleExam = async (type: number): Promise<boolean> => {
  // 每日答题
  if (type === 0) {
    // 跳转每日答题
    const gotoRes = await shared.gotoPage(URL_CONFIG.examPractice, {
      waitUntil: 'domcontentloaded',
    });
    // 页面
    const page = shared.getPage();
    // 跳转成功
    if (gotoRes && page) {
      // 开始答题
      await handleQuestion(page, 0);
      // 任务列表
      await shared.getTaskList();
      // 继续做
      if (shared.taskList && !shared.taskList[2].status) {
        shared.log.info('未完成任务, 继续每日答题!');
        // 重新答题
        return await handleExam(0);
      }
      return true;
    }
    shared.log.info('每日答题 页面跳转失败!');
    return false;
  }
  // 专项练习
  if (type === 1) {
    // 查找题号
    const examPaper = await findExamPaper();
    // 不存在习题
    if (!examPaper) {
      return true;
    }
    // 题号 名称
    const { id, name } = examPaper;
    // 专项练习链接
    const url = `${URL_CONFIG.examPaper}?id=${id}`;
    shared.log.warn('专项练习, 题目信息');
    shared.log.info(`标题: ${chalk.yellow(name)}`);
    shared.log.info(`链接: ${chalk.yellow(url)}`);
    // 跳转专项练习
    const gotoRes = await shared.gotoPage(url, {
      waitUntil: 'domcontentloaded',
    });
    // 页面
    const page = shared.getPage();
    // 请求成功
    if (gotoRes && page) {
      // 答题结果
      const result = await handleQuestion(page, 2);
      // 答题失败
      if (!result) {
        shared.log.fail('专项练习, 答题错误或失败!');
        // 推送学习提示
        shared.pushModal({
          title: '学习提示',
          content: [
            '专项练习, 答题错误或失败!',
            `标题: ${getHighlightHTML(name)}`,
            `链接: ${getHighlightHTML(url)}`,
          ],
          type: 'fail',
        });
      }
      return result;
    }
    shared.log.info('专项练习 页面跳转失败!');
    return false;
  }
  return false;
};

/**
 * @description 初始化答题
 * @returns
 */
const initExam = async () => {
  // 请求第一页
  const res = await getExamPaper(1);
  if (res) {
    // 总页数
    const { totalPageCount } = res;
    // 请求速率限制
    await sleep(STUDY_CONFIG.rateLimit);
    return totalPageCount;
  }
};

/**
 * @description 获取专项练习
 * @returns
 */
const findExamPaper = async () => {
  // 总页数
  const total = await initExam();
  // 当前页数
  let current = STUDY_CONFIG.paperReverse ? total : 1;
  if (total && current) {
    while (current <= total && current) {
      // 当前页数数据
      const res = await getExamPaper(current);
      if (res) {
        // 专项练习列表
        const examPapers = res.list;
        // 逆序专项练习列表
        if (STUDY_CONFIG.paperReverse) {
          examPapers.reverse();
        }
        // 遍历专项练习列表
        for (const i in examPapers) {
          // 1为"开始答题" , 2为"重新答题"
          if (examPapers[i].status === 1) {
            return examPapers[i];
          }
        }
        current += STUDY_CONFIG.paperReverse ? -1 : 1;
        // 请求速率限制
        await sleep(STUDY_CONFIG.rateLimit);
      } else {
        break;
      }
    }
  }
};

/**
 * @description 处理练习
 * @param page 页面
 * @param type 类型
 * @returns
 */
const handleQuestion = async (page: pup.Page, type: number) => {
  // 题目加载
  shared.log.loading('正在加载题目...');
  // 等待题目加载完成
  const res = await page.evaluate((time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // 题目
        const question = document.querySelector('.question');
        // 题目存在
        if (question) {
          // 清除定时器
          clearInterval(timer);
          // 清除超时延迟
          clearTimeout(timeout);
          resolve(true);
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        // 清除定时器
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 题目加载失败
  if (!res) {
    // 题目加载
    shared.log.fail('题目加载失败!');
    return false;
  }
  // 题目加载成功
  shared.log.success('题目加载成功!');
  // 进度
  shared.log.info('开始答题!');
  // 总答题结果
  let result = true;
  // 获取题号
  let { total, current } = await getQuestionNum(page);
  // 开始答题
  for (let i = 0; i < total; i++) {
    // 获取按钮
    let btnText = await getNextBtnText(page);
    // 结束按钮文字
    const finish = ['再练一次', '再来一组', '查看解析'];
    // 结束
    if (finish.includes(btnText)) {
      break;
    }
    // 获取题号
    ({ current } = await getQuestionNum(page));
    // 获取题型
    const questionType = await getQuestionType(page);
    // 题目
    const question = await getQuestion(page);
    // 显示进度
    shared.log.loading(
      `${chalk.blueBright(current)} / ${total} | 题型: ${chalk.blueBright(
        questionType
      )} | 题目: ${question.replaceAll('\n', '')}`
    );

    // 默认值
    let res = false;
    // 单选题
    if (questionType === '单选题') {
      res = await handleSingleChoice(page);
    }
    // 多选题
    if (questionType === '多选题') {
      res = await handleMutiplyChoice(page);
    }
    // 填空题
    if (questionType === '填空题') {
      res = await handleFillBlanks(page);
    }
    // 答题成功
    if (res) {
      // 显示进度
      shared.log.loading(`${chalk.blueBright(current)} / ${total} 答题成功!`);
    } else {
      // 显示进度
      shared.log.loading(`${chalk.blueBright(current)} / ${total} 答题失败!`);
      // 可能答错且无答案
      result = false;
      if (type === 1 && (<StudyParams>shared.params).paperExitAfterWrong) {
        return result;
      }
      // 随机答题
      await handleRandAnswers(page, questionType);
    }
    // 等待跳转
    await sleep(3000);
    // 获取按钮
    btnText = await getNextBtnText(page);
    // 提交答案
    if (btnText === '确定') {
      // 点击
      await clickNextBtn(page);
      // 等待跳转
      await sleep(3000);
      // 获取按钮
      btnText = await getNextBtnText(page);
      // 是否答错
      if (btnText === '下一题' || btnText === '完成') {
        // 是否答错
        const wrong = await isWrong(page);
        // 答错
        if (wrong) {
          // 显示进度
          shared.log.loading(
            `${chalk.blueBright(current)} / ${total} 答案错误!`
          );
          // 上传答案
          await saveAnswerFromWrong(page);
          // 可能答错
          result = false;
        }
      }
    }
    // 等待
    await sleep(3000);
    // 获取按钮
    btnText = await getNextBtnText(page);
    // 跳转下一题
    if (btnText === '下一题' || btnText === '完成' || btnText === '交卷') {
      // 点击
      await clickNextBtn(page);
    }
    // 等待跳转
    await sleep(3000);
    // 存在滑动验证
    const exists = await hasSlideVerify(page);
    // 处理滑动验证
    if (exists) {
      shared.log.loading('正在处理滑动验证...');
      // 显示滑动验证
      await showSlideVerify(page);
      // 处理滑动验证
      await handleSlideVerify(page);
      // 等待提交
      await sleep(3000);
      // 存在滑动验证
      const exists = await hasSlideVerify(page);
      if (exists) {
        shared.log.fail('处理滑动验证失败!');
        shared.log.loading('正在处理滑动验证...');
        // 显示滑动验证
        await showSlideVerify(page);
        // 处理滑动验证
        await handleSlideVerify(page);
        // 等待提交
        await sleep(3000);
        // 存在滑动验证
        const exists = await hasSlideVerify(page);
        if (exists) {
          shared.log.fail('再次处理滑动验证失败!');
        } else {
          shared.log.success('再次处理滑动验证成功!');
        }
      } else {
        shared.log.success('处理滑动验证成功!');
      }
    }
  }
  shared.log.success(`${chalk.blueBright(current)} / ${total} 答题完成!`);
  // 等待结果提交
  const waitRes = await waitResult(page);
  if (waitRes) {
    shared.log.success('提交答题成功!');
  } else {
    shared.log.fail('提交答题失败!');
  }
  return result;
};

/**
 * @description 是否答错
 * @param page 页面
 * @returns
 */
const isWrong = async (page: pup.Page) => {
  // 答案内容
  return await page.evaluate(() => {
    // 答案
    const answerBox = document.querySelector('.answer');
    return !!(answerBox && (<HTMLDivElement>answerBox).innerText.length);
  });
};

/**
 * @description 获取下个按钮
 * @param page 页面
 * @returns
 */
const getNextBtnText = async (page: pup.Page) => {
  return await page.$$eval('.ant-btn', (btns) => {
    return new Promise<string>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // 下一步按钮
        const nextAll = (<HTMLButtonElement[]>btns).filter(
          (next) => next.innerText.length
        );
        // 数量不唯一
        if (nextAll.length) {
          // 清除定时器
          clearInterval(timer);
          if (nextAll.length === 2) {
            resolve(nextAll[1].innerText.replaceAll(' ', ''));
            return;
          }
          resolve(nextAll[0].innerText.replaceAll(' ', ''));
        }
      }, 100);
    });
  });
};

/**
 * @description 点击下个按钮
 * @param page 页面
 * @returns
 */
const clickNextBtn = async (page: pup.Page) => {
  return await page.$$eval('.ant-btn', (btns) => {
    // 下一步按钮
    const nextAll = (<HTMLButtonElement[]>btns).filter(
      (next) => next.innerText.length
    );
    // 数量不唯一
    if (nextAll.length) {
      if (nextAll.length === 2) {
        nextAll[1].click();
        return true;
      }
      nextAll[0].click();
      return true;
    }
    return false;
  });
};
/**
 * @description 获取题号信息
 * @param page 页面
 * @returns
 */
const getQuestionNum = async (page: pup.Page) => {
  // 当前题号 总题数
  const [current, total] = await page.$eval('.pager', (node) =>
    (<HTMLElement>node).innerText.split('/').map((txt) => Number(txt))
  );
  return {
    total,
    current,
  };
};

/**
 * @description 获取题目
 * @param page 页面
 * @returns
 */
const getQuestion = async (page: pup.Page) => {
  // 题目内容
  const content = await getText(page, '.q-body');
  return content.trim();
};

/**
 * @description 获取题型
 * @param page 页面
 * @returns
 */
const getQuestionType = async (page: pup.Page) => {
  // 题型文本
  const questionTypeText = await getText(page, '.q-header');
  // 题型
  const questionType = questionTypeText.trim().substring(0, 3);
  return <'填空题' | '单选题' | '多选题'>questionType;
};

/**
 * @description 选择按钮
 * @param page 页面
 * @param answers
 * @returns
 */
const handleChoiceBtn = async (page: pup.Page, answers: string[]) => {
  return await page.$$eval(
    '.q-answer',
    (nodes, answers) => {
      // 所有选项
      const choices = <HTMLButtonElement[]>nodes;
      // 答案存在
      if (nodes.length && answers.length) {
        // 答案是否对应选项
        return answers.every((answer) => {
          // 最小长度按钮
          let minLengthChoice: HTMLButtonElement | undefined;
          // 遍历
          choices.forEach((choice) => {
            // 选项文本
            const choiceText = choice.innerText.trim();
            // 答案选项存在
            if (answer && choiceText) {
              // 无符号选项文本
              const unsignedChoiceText = choiceText.replaceAll(
                /[、，,。 ]/g,
                ''
              );
              // 无符号答案
              const unsignedAnswer = answer.replaceAll(/[、，,。 ]/g, '');
              // 存在答案文本
              if (
                choiceText === answer ||
                choiceText.includes(answer) ||
                answer.includes(choiceText) ||
                unsignedChoiceText.includes(unsignedAnswer)
              ) {
                // 最小长度选项有值
                if (minLengthChoice) {
                  // 最短长度选项与当前选项比较长度
                  if (minLengthChoice.innerText.length > choiceText.length) {
                    minLengthChoice = choice;
                  }
                } else {
                  // 最小长度选项赋值
                  minLengthChoice = choice;
                }
              }
            }
          });
          // 存在选项
          if (minLengthChoice) {
            // 选择
            if (!minLengthChoice.classList.contains('chosen')) {
              minLengthChoice.click();
            }
            return true;
          }
          return false;
        });
      }
      return false;
    },
    answers
  );
};

/**
 * @description 填空题
 * @param page 页面
 * @param answers
 * @returns
 */
const handleBlankInput = async (page: pup.Page, answers: string[]) => {
  return await page.$$eval(
    '.blank',
    (nodes, answers) => {
      // 所有填空
      const blanks = <HTMLInputElement[]>nodes;
      // 答案存在
      if (blanks.length && answers.length) {
        // 填空数量和答案数量一致
        if (answers.length === blanks.length) {
          return answers.every((answer, i) => {
            // 答案存在
            if (answer && answer.length) {
              // 输入事件
              const inputEvent = new Event('input', {
                bubbles: true,
              });
              // 设置答案
              blanks[i].setAttribute('value', answer);
              // 触发输入input
              blanks[i].dispatchEvent(inputEvent);
              return true;
            }
            return false;
          });
        }
        // 填空数量为1和提示数量大于1
        if (blanks.length === 1 && answers.length > 1) {
          // 直接将所有答案整合填进去
          const answer = answers.join('');
          // 答案存在
          if (answer && answer.length) {
            // 输入事件
            const inputEvent = new Event('input', {
              bubbles: true,
            });
            // 设置答案
            blanks[0].setAttribute('value', answer);
            // 触发输入input
            blanks[0].dispatchEvent(inputEvent);
            return true;
          }
        }
      }
      return false;
    },
    answers
  );
};

/**
 * @description 单选题
 * @param page 页面
 * @returns
 */
const handleSingleChoice = async (page: pup.Page) => {
  // 获取答案
  const answers = await getAnswerByTips(page);
  // 存在答案
  if (answers.length) {
    // 单答案单选项
    if (answers.length === 1) {
      // 尝试查找点击
      const res = await handleChoiceBtn(page, answers);
      if (res) {
        return true;
      }
      // 判断题
      // 选项
      const choicesText = await getBatchText(page, '.q-answer');
      // 关键词
      const keys = ['正确', '错误'];
      // 判断题
      const exists = choicesText
        .map((choice) => choice.replace(/[A-Z]\./, '').trim())
        .every((choice) => keys.includes(choice));
      // 题目内容
      const question = await getQuestion(page);
      // 题目包含答案
      if (question.includes(answers[0]) && choicesText.length === 2 && exists) {
        //答案
        const answer = '正确';
        // 尝试查找点击
        const res = await handleChoiceBtn(page, [answer]);
        if (res) {
          return true;
        }
      }
    } else {
      // 多答案单选项
      // 可能分隔符
      const seperator = ['', ' ', '，', ';', ',', '、', '-', '|', '+', '/'];
      // 可能答案
      const answersLike = seperator.map((s) => answers.join(s));
      // 答案存在
      if (answersLike.every((answer) => answer.length)) {
        // 可能答案是否正确
        for (const i in answersLike) {
          // 尝试查找点击
          const res = await handleChoiceBtn(page, [answersLike[i]]);
          if (res) {
            return true;
          }
        }
      }
      // 答案存在
      if (answers.every((answer) => answer.length)) {
        // 可能答案是否正确
        for (const i in answers) {
          // 尝试查找点击
          const res = await handleChoiceBtn(page, [answers[i]]);
          if (res) {
            return true;
          }
        }
      }
    }
  }
  // 异常判断: 提示答案不存在 | 提示答案不对应选项
  const answersNetwork = await getAnswerByNetwork(page);
  // 存在答案
  if (answersNetwork.length) {
    // 单答案单选项
    if (answersNetwork.length === 1) {
      // 尝试查找点击
      const res = await handleChoiceBtn(page, answersNetwork);
      if (res) {
        return true;
      }
    } else {
      // 多答案单选项 选项意外拆分
      // 可能分隔符
      const seperator = ['', ' ', ';'];
      // 可能答案
      const answersLike = seperator.map((s) => answers.join(s));
      // 答案存在
      if (answersLike.every((answer) => answer.length)) {
        // 可能答案是否正确
        for (const i in answersLike) {
          // 尝试查找点击
          const res = await handleChoiceBtn(page, [answersLike[i]]);
          if (res) {
            return true;
          }
        }
      }
    }
  }
  return false;
};

/**
 * @description 多选题
 * @param page 页面
 * @returns
 */
const handleMutiplyChoice = async (page: pup.Page) => {
  // 获取答案
  const answers = await getAnswerByTips(page);
  // 选项文本
  const choicesText = await getBatchText(page, '.q-answer');
  // 选项内容
  const choicesContent = choicesText.map((choiceText) =>
    choiceText.split(/[A-Z]\./)[1].trim()
  );
  // 题目内容
  const question = await getQuestion(page);
  // 填空
  const blanks = question.match(/（）/g) || [];
  // 简单判断: 填空数===选项数 | 选项数===2 | 选项全文===答案全文
  if (
    choicesText.length === blanks.length ||
    choicesText.length === 2 ||
    answers.join('') === choicesContent.join('')
  ) {
    // 全选
    await page.$$eval('.q-answer', (nodes) => {
      (<HTMLButtonElement[]>nodes).forEach((btn) => {
        if (!btn.classList.contains('chosen')) {
          btn.click();
        }
      });
    });
    return true;
  }
  // 复杂判断: 存在答案
  if (answers.length) {
    // 选项数量>=答案数量
    if (choicesText.length >= answers.length) {
      // 尝试查找点击
      const res = await handleChoiceBtn(page, answers);
      if (res) {
        return true;
      }
    }
  }
  // 异常判断: 提示答案不存在 | 提示答案不对应选项 | 填空数量<选项数量
  const answersNetwork = await getAnswerByNetwork(page);
  // 存在答案
  if (answersNetwork.length) {
    // 尝试查找点击
    const res = await handleChoiceBtn(page, answers);
    if (res) {
      return true;
    }
  }
  return false;
};

/**
 * @description 填空题
 * @param page 页面
 * @returns
 */
const handleFillBlanks = async (page: pup.Page) => {
  // 获取答案
  const answers = await getAnswerByTips(page);
  // 复杂判断: 答案存在
  if (answers.length) {
    // 尝试填空
    const res = await handleBlankInput(page, answers);
    if (res) {
      return true;
    }
  }
  // 异常判断: 提示答案不存在 | 提示答案不对应填空
  const answersNetwork = await getAnswerByNetwork(page);
  // 答案存在
  if (answersNetwork.length) {
    // 尝试填空
    const res = await handleBlankInput(page, answersNetwork);
    if (res) {
      return true;
    }
  }
  return false;
};

/**
 * @description 通过提示获取答案
 * @param page 页面
 * @returns
 */
const getAnswerByTips = async (page: pup.Page) => {
  // 点击提示
  await page.$eval('.tips', (node) => {
    (<HTMLButtonElement>node).click();
  });
  // 获取答案
  return await (
    await getBatchText(page, '.line-feed font[color]')
  ).map((ans) => ans.trim());
};

/**
 * @description 通过网络获取答案
 * @param page 页面
 * @returns
 */
const getAnswerByNetwork = async (page: pup.Page) => {
  // 题目内容
  const question = await getQuestion(page);
  // 获取答案
  const answers = await getAnswerSearch(question);
  if (answers.length) {
    return answers;
  }
  return [];
};

/**
 * @description 获取密钥
 * @param page 页面
 * @returns
 */
const getKey = async (page: pup.Page) => {
  // 题目内容
  const question = await getQuestion(page);
  // md5加密
  const key = md5(question);
  return key;
};

/**
 * @description 通过错题上传答案
 * @param page 页面
 * @returns
 */
const saveAnswerFromWrong = async (page: pup.Page) => {
  // 答案内容
  const answerText = await getText(page, '.answer');
  // 从字符串中拿出答案
  const [, rawaAnswer] = answerText.split('：');
  // 替换
  const answer = rawaAnswer.replaceAll(' ', ';');
  // 答案存在
  if (answer && answer.length) {
    const key = await getKey(page);
    if (key) {
      // 上传答案
      saveAnswer(key, answer);
      return true;
    }
  }
  return false;
};
/**
 * @description 存在滑动验证
 * @param page
 */
const hasSlideVerify = async (page: pup.Page) => {
  // 是否滑块
  const exists = await page.$eval('#nc_mask', (node) => {
    // 遮罩
    const mask = <HTMLElement>node;
    // 提升层级
    if (mask) {
      mask.style.zIndex = '999999';
    }
    return mask && getComputedStyle(mask).display !== 'none';
  });
  return exists;
};
/**
 * @description 显示滑动验证
 * @param page
 * @returns
 */
const showSlideVerify = async (page: pup.Page) => {
  // 加载状态
  let loadingStatus = false;
  // 加载滑动验证
  while (!loadingStatus) {
    // 等待加载
    loadingStatus = await page.evaluate((time) => {
      return new Promise<boolean>((resolve) => {
        // 定时器
        const timer = setInterval(() => {
          const nc_scale = document.querySelector<HTMLElement>('.nc_scale');
          const btn_slide = document.querySelector<HTMLElement>('.btn_slide');
          // 加载成功
          if (nc_scale && btn_slide) {
            // 清除定时器
            clearInterval(timer);
            // 清除超时延迟
            clearTimeout(timeout);
            resolve(true);
          }
        }, 100);
        // 超时
        const timeout = setTimeout(() => {
          // 清除定时器
          clearInterval(timer);
          resolve(false);
        }, time);
      });
    }, STUDY_CONFIG.timeout);
    // 滑动验证加载失败
    if (!loadingStatus) {
      // 关闭滑动验证
      await page.$eval('.button-close', (node) => {
        const btn = <HTMLElement>node;
        btn.click();
      });
      await sleep(3000);
      // 点击
      await clickNextBtn(page);
    }
  }
};

/**
 * @description 处理滑块验证
 * @param page 页面
 */
const handleSlideVerify = async (page: pup.Page) => {
  // 轨道
  const track = await getBounds(page, '.nc_scale');
  // 滑块
  const slide = await getBounds(page, '.btn_slide');
  // 轨道滑块
  if (slide && track) {
    // 范围内随机起点
    const start = createRandomPoint(slide);
    // 终点
    const end = {
      x: track.x + track.width,
      y: track.y + track.height / 2,
    };
    // 路径
    const path = createRandomPath(start, end, 8);
    // 滑动到起点
    await page.mouse.move(start.x, start.y, { steps: 1 });
    // tap
    await page.touchscreen.tap(start.x, start.y);
    // 按下按钮
    await page.mouse.down();
    // 滑动
    for (const i in path) {
      await page.mouse.move(path[i].x, path[i].y, { steps: 1 });
    }
    // tap
    await page.touchscreen.tap(
      path[path.length - 1].x,
      path[path.length - 1].y
    );
    // 按键抬起
    await page.mouse.up();
  }
};

/**
 * @description 等待结果提交
 * @param page 页面
 * @returns
 */
const waitResult = async (page: pup.Page) => {
  // 获取按钮
  const btnText = await getNextBtnText(page);
  return new Promise<boolean>((resolve) => {
    // 结束
    const finish = ['再练一次', '再来一组', '查看解析'];
    // 未结束
    if (!finish.includes(btnText)) {
      const timer = setInterval(async () => {
        // 获取按钮
        const btnText = await getNextBtnText(page);
        if (finish.includes(btnText)) {
          // 清除超时
          clearTimeout(timeout);
          // 清除定时器
          clearInterval(timer);
          resolve(true);
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        // 清除定时器
        clearInterval(timer);
        resolve(false);
      }, STUDY_CONFIG.timeout);
      return;
    }
    resolve(true);
  });
};

/**
 * @description 随机答题
 * @param page 页面
 * @param questionType 题型
 * @returns
 */
const handleRandAnswers = async (page: pup.Page, questionType: string) => {
  // 单选题
  if (questionType === '单选题') {
    // 选项
    const answers = await getBatchText(page, '.q-answer');
    // 随机数
    const randIndex = ~~(Math.random() * answers.length);
    // 随机选择
    return await handleChoiceBtn(page, [answers[randIndex]]);
  }
  // 多选题
  if (questionType === '多选题') {
    // 选项作为答案
    const answers = await getBatchText(page, '.q-answer');
    // 全选
    return await handleChoiceBtn(page, answers);
  }
  // 填空题
  if (questionType === '填空题') {
    // 填空数量
    const blankCount = await getCount(page, '.blank');
    // 答案
    const answers = Array.from<string>({ length: blankCount });
    // 随机答案
    for (const i in answers) {
      answers[i] = i;
    }
    // 随机答案
    return await handleBlankInput(page, answers);
  }
};

/**
 * @description 答案数据
 */
export type AnswerData = {
  status: number;
  data: { txt_content: string; txt_name: string };
};
/**
 * @description 答题
 */
type ExamPractices = {
  id: number;
  questionNum: number;
  alreadyAnswerNum: number;
  tipScore: number;
  name: string;
  status: number;
  startDate: string;
}[];

/**
 * @description 专项练习数据
 * @param pageNo 页码
 * @returns
 */
export const getExamPaper = async (pageNo: number) => {
  // 获取页面
  const page = shared.getPage();
  if (!page) {
    return;
  }
  try {
    // 获取 cookies
    const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
    // cookie
    const cookie = stringfyCookie(cookies);
    // 获取专项练习
    const data = await examPaper(cookie, pageNo);
    // 答题数据
    const paperJson = decodeURIComponent(
      escape(atob(data.data_str.replace(/-/g, '+').replace(/_/g, '/')))
    );
    // JSON格式化
    const paper = <
      {
        list: ExamPractices;
        totalPageCount: number;
      }
    >JSON.parse(paperJson);
    return paper;
  } catch (e) {}
};

/**
 * @description 保存答案
 * @param key 密钥
 * @param value 答案值
 * @returns
 */
export const saveAnswer = async (key: string, value: string) => {
  try {
    // 内容
    const content = JSON.stringify([{ title: key, content: value }]);
    // 数据
    const data = {
      txt_name: key,
      txt_content: content,
      password: '',
      v_id: '',
    };
    // 请求体
    const params = new URLSearchParams(data);
    // 保存答案
    const res = await postAnswer(params.toString());
    return res;
  } catch (e) {}
};

/**
 * @description 获取答案
 * @param question 题目
 * @returns
 */
export const getAnswerSearch = async (question: string) => {
  try {
    // 数据
    const data = {
      txt_name: md5(question),
      password: '',
    };
    const params = new URLSearchParams(data);
    // 保存答案
    const res = await getAnswer(params.toString());
    if (res) {
      const { data, status } = <AnswerData>res;
      if (status !== 0) {
        // 答案列表
        const answerList: { content: string; title: string }[] = JSON.parse(
          data.txt_content
        );
        // 答案
        const answers = answerList[0].content.split(/[;\s]/);
        return answers;
      }
    }
  } catch (e) {}
  return [];
};

export default handleExam;
