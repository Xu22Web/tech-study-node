import md5 from 'blueimp-md5';
import chalk from 'chalk';
import ora from 'ora';
import pup from 'puppeteer-core';
import {
  getAnswer,
  getAnswerOthers,
  getExamPaper,
  getExamWeekly,
  getTaskList,
  saveAnswer,
} from '../apis';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import {
  createRandomPath,
  createRandomPoint,
  getBatchText,
  getBounds,
  getCount,
  getText,
  sleep,
  pushModal,
  gotoPage,
} from '../utils';
/**
 * @description 练习测试
 * @param page
 * @param type
 */
const handleExam = async (
  page: pup.Page,
  type: number
): Promise<
  | {
      page: pup.Page;
      result: boolean;
    }
  | undefined
> => {
  // 每日答题
  if (type === 0) {
    // 跳转每周答题
    const pageData = await gotoPage(page, URL_CONFIG.examPractice, {
      waitUntil: 'domcontentloaded',
    });
    // 跳转成功
    if (pageData) {
      // 页面
      const { page } = pageData;
      // 开始答题
      const { result } = await handleQuestion(page, 0);
      // 任务列表
      const taskList = await getTaskList(page);
      // 继续做
      if (taskList.length && !taskList[2].status) {
        // 重新答题
        return await handleExam(page, 0);
      }
      return {
        page,
        result,
      };
    }
  }
  // 每周答题
  if (type === 1) {
    // 查找题号
    const examWeekly = await findExamWeekly(page);
    // 存在习题
    if (examWeekly) {
      // id
      const { id } = examWeekly;
      // 跳转每周答题
      const pageData = await gotoPage(
        page,
        `${URL_CONFIG.examWeekly}?id=${id}`,
        {
          waitUntil: 'domcontentloaded',
        }
      );
      // 跳转成功
      if (pageData) {
        // 页面
        const { page } = pageData;
        // 答题结果
        const { result, title, url } = await handleQuestion(page, 1);
        // 答题失败
        if (!result) {
          // 推送学习提示
          pushModal({
            title: '学习提示',
            content: [
              '每周答题, 答错且无答案!',
              `标题: <span style="color: #1890ff">${title}</span>`,
              `链接: <span style="color: #1890ff">${url}</span>`,
            ],
            type: 'warn',
          });
        }
        return { page, result };
      }
    } else {
      return { page, result: true };
    }
  }
  // 专项练习
  if (type === 2) {
    // 查找题号
    const examPaper = await findExamPaper(page);
    // 存在习题
    if (examPaper) {
      // id
      const { id } = examPaper;
      // 跳转专项练习
      const pageData = await gotoPage(
        page,
        `${URL_CONFIG.examPaper}?id=${id}`,
        {
          waitUntil: 'domcontentloaded',
        }
      );
      // 请求成功
      if (pageData) {
        // 页面
        const { page } = pageData;
        // 答题结果
        const { result, title, url } = await handleQuestion(page, 1);
        // 答题失败
        if (!result) {
          // 推送学习提示
          pushModal({
            title: '学习提示',
            content: [
              '专项练习, 答错且无答案!',
              `标题: <span style="color: #1890ff">${title}</span>`,
              `链接: <span style="color: #1890ff">${url}</span>`,
            ],
            type: 'warn',
          });
        }
        return { page, result };
      }
    } else {
      return { page, result: true };
    }
  }
};

/**
 * @description 初始化答题
 * @param page
 * @returns
 */
const initExam = async (page: pup.Page, type: number = 0) => {
  // 每周答题
  if (type === 0) {
    // 请求第一页
    const res = await getExamWeekly(page, 1);
    if (res) {
      // 总页数
      const { totalPageCount } = res;
      // 请求速率限制
      await sleep(STUDY_CONFIG.rateLimitms);
      return totalPageCount;
    }
    return;
  }
  // 专项练习
  if (type === 1) {
    // 请求第一页
    const res = await getExamPaper(page, 1);
    if (res) {
      // 总页数
      const { totalPageCount } = res;
      // 请求速率限制
      await sleep(STUDY_CONFIG.rateLimitms);
      return totalPageCount;
    }
  }
};
/**
 * @description 获取每周答题
 * @param page
 * @returns
 */
const findExamWeekly = async (page: pup.Page) => {
  // 总页数
  const total = await initExam(page);
  // 当前页数
  let current = STUDY_CONFIG.weeklyReverse ? total : 1;
  if (total && current) {
    while (current <= total && current) {
      // 当前页数数据
      const res = await getExamWeekly(page, current);
      if (res) {
        const { list } = res;
        for (const i in list) {
          // 获取每周列表
          const examWeeks = list[i].practices;
          // 逆序每周列表
          if (STUDY_CONFIG.weeklyReverse) {
            examWeeks.reverse();
          }
          // 查询每周的测试列表
          for (const j in examWeeks) {
            // 遍历查询有没有没做过的 1为"开始答题" , 2为"重新答题"
            if (examWeeks[j].status !== 2) {
              return examWeeks[j];
            }
          }
        }
        current += STUDY_CONFIG.weeklyReverse ? -1 : 1;
        // 请求速率限制
        await sleep(STUDY_CONFIG.rateLimitms);
      } else {
        break;
      }
    }
    return;
  }
};
/**
 * @description 获取每周答题
 * @param page
 * @returns
 */
const findExamPaper = async (page: pup.Page) => {
  // 总页数
  const total = await initExam(page, 1);
  // 当前页数
  let current = STUDY_CONFIG.paperReverse ? total : 1;
  if (total && current) {
    while (current <= total && current) {
      // 当前页数数据
      const res = await getExamPaper(page, current);
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
          if (examPapers[i].status !== 2) {
            return examPapers[i];
          }
        }
        current += STUDY_CONFIG.paperReverse ? -1 : 1;
        // 请求速率限制
        await sleep(STUDY_CONFIG.rateLimitms);
      } else {
        break;
      }
    }
  }
};
/**
 * @description 处理练习
 */
const handleQuestion = async (page: pup.Page, type: number) => {
  // 等待题目加载完成
  await page.waitForSelector('.question');
  // 支持类型
  const supportType = ['填空题', '单选题', '多选题'];
  // 获取题号
  const { total } = await getQuestionNum(page);
  // 标题
  const title = await getText(page, '.title');
  // 链接
  const url = page.target().url();
  // 总答题结果
  let result = true;
  // 进度
  const progress = ora('开始答题!');
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
    const { current } = await getQuestionNum(page);
    // 获取题型
    const questionType = await getQuestionType(page);
    // 显示进度
    progress.start(
      `${chalk.blueBright(current)} / ${total} | 题型: ${chalk.blueBright(
        questionType
      )}`
    );
    // 验证题型
    if (supportType.includes(questionType)) {
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
        progress.start(
          `${chalk.blueBright(current)} / ${total} | 题型: ${chalk.blueBright(
            questionType
          )} 答题成功!`
        );
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
              progress.start(
                `${chalk.blueBright(
                  current
                )} / ${total} | 题型: ${chalk.blueBright(
                  questionType
                )} 答题成功, 答案错误!`
              );
              // 上传答案
              await saveAnswerFromWrong(page);
              // 可能答错
              result = false;
              if (type === 1 && STUDY_CONFIG.weeklyExitExamAfterWrong) {
                return {
                  title,
                  url,
                  result,
                };
              }
              if (type === 2 && STUDY_CONFIG.paperExitExamAfterWrong) {
                return {
                  title,
                  url,
                  result,
                };
              }
            } else {
              // 显示进度
              progress.start(
                `${chalk.blueBright(
                  current
                )} / ${total} | 题型: ${chalk.blueBright(
                  questionType
                )} 答题成功, 答案正确!`
              );
            }
          }
        }
      } else {
        // 显示进度
        progress.start(
          `${chalk.blueBright(current)} / ${total} | 题型: ${chalk.blueBright(
            questionType
          )} 答题失败, 无答案!`
        );
        // 可能答错且无答案
        result = false;
        if (type === 1 && STUDY_CONFIG.weeklyExitExamAfterWrong) {
          return {
            title,
            url,
            result,
          };
        }
        if (type === 2 && STUDY_CONFIG.paperExitExamAfterWrong) {
          return {
            title,
            url,
            result,
          };
        }
        // 随机答题
        await handleRandAnswers(page, questionType);
      }
    } else {
      // 显示进度
      progress.start(
        `${chalk.blueBright(current)} / ${total} | 题型: ${chalk.blueBright(
          questionType
        )} 答题失败, 题型错误!`
      );
      // 题型错误,取消答题
      result = false;
      return {
        title,
        url,
        result,
      };
    }
    // 等待跳转
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
    // 等待滑动验证
    await handleSildeVerify(page);
  }
  progress.succeed(`${chalk.blueBright(total)} / ${total} 答题完成!`);
  // 等待结果提交
  await waitResult(page);
  // 等待提交
  await sleep(3000);
  return {
    title,
    url,
    result,
  };
};
/**
 * @description 是否答错
 * @param page
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
 * @param page
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
          clearInterval(timer); // 停止定时器
          if (nextAll.length === 2) {
            resolve(nextAll[1].innerText.replaceAll(' ', ''));
            return;
          }
          resolve(nextAll[0].innerText.replaceAll(' ', ''));
        }
      }, 500);
    });
  });
};
/**
 * @description 点击下个按钮
 * @param page
 * @returns
 */
const clickNextBtn = async (page: pup.Page) => {
  return await page.$$eval('.ant-btn:not([disabled])', (btns) => {
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
 * @param answers 答案
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
            // 无符号选项文本
            const unsignedChoiceText = choiceText.replaceAll(/[、，,。 ]/g, '');
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
 * @param answers 答案
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
 * @param page
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
    }
  }
  // 提示答案不存在 | 提示答案不对应选项
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
  // 选项数
  const choiceBtnCount = await getCount(page, '.q-answer');
  // 存在答案
  if (answers.length) {
    // 题目内容
    const content = await getText(page, '.q-body');
    // 选项文本
    const choicesText = await getBatchText(page, '.q-answer');
    // 选项内容
    const choicesContent = choicesText
      .map((choiceText) => choiceText.split(/[A-Z]./)[1].trim())
      .join('');
    // 填空
    const blanks = content.match(/（）/g) || [];
    // 填空数量、选项数量、答案数量相同 | 选项全文等于答案全文
    if (
      (choiceBtnCount === answers.length && blanks.length === answers.length) ||
      answers.join('') === choicesContent
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
    // 选项数量大于等于答案数量
    if (choiceBtnCount >= answers.length) {
      // 尝试查找点击
      const res = await handleChoiceBtn(page, answers);
      if (res) {
        return true;
      }
    }
  }
  // 提示答案不存在 | 提示答案不对应选项 | 填空数量小于选项数量
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
 * @param page
 * @returns
 */
const handleFillBlanks = async (page: pup.Page) => {
  // 获取答案
  const answers = await getAnswerByTips(page);
  // 答案存在
  if (answers.length) {
    // 尝试填空
    const res = await handleBlankInput(page, answers);
    if (res) {
      return true;
    }
  }
  // 提示答案不存在 | 提示答案不对应选项
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
  await page.click('.tips');
  // 获取答案
  return await (
    await getBatchText(page, '.line-feed font[color=red]')
  ).map((ans) => ans.trim());
};
/**
 * @description 通过网络获取答案
 * @param page
 * @returns
 */
const getAnswerByNetwork = async (page: pup.Page) => {
  // 题目内容
  const content = await getText(page, '.q-body');
  // md5加密
  const key = await getKey(page);
  // 获取答案
  const answers = await getAnswer(key);
  if (answers.length) {
    return answers;
  }
  // 答案
  const questionClip = content.substring(0, 10);
  // 获取其他答案
  const otherAnsers = await getAnswerOthers(questionClip);
  if (otherAnsers.length) {
    return otherAnsers;
  }
  return [];
};
/**
 * @description 获取密钥
 * @param page
 * @returns
 */
const getKey = async (page: pup.Page) => {
  // 题目内容
  const content = await getText(page, '.q-body');
  // md5加密
  const key = md5(content);
  return key;
};
/**
 * @description 通过错题上传答案
 * @param page
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
    // 上传答案
    saveAnswer(key, answer);
    return true;
  }
  return false;
};
// /**
//  * @description 通过手动答题上传答案
//  * @param page
//  * @returns
//  */
// const saveAnswerFromManual = async (page: pup.Page) => {
//   // 答案内容
//   const answersText = await getBatchText(page, '.q-answer.chosen');
//   // 从字符串中拿出答案
//   const answer = answersText.map((ans) => ans.split('.')[1].trim()).join(';');
//   if (answer && answer.length) {
//     const key = await getKey(page);
//     // 上传答案
//     await saveAnswer(key, answer);
//     return true;
//   }
//   return false;
// };
// 处理滑块验证
const handleSildeVerify = async (page: pup.Page) => {
  // 是否滑块
  const exists = await page.$eval('#nc_mask', (node) => {
    const mask = <HTMLElement>node;
    return mask && getComputedStyle(mask).display !== 'none';
  });
  // 存在滑块
  if (exists) {
    // 等待加载
    await page.waitForSelector('.nc-container');
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
      const path = createRandomPath(start, end, 5);
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
  }
};
/**
 * @description 等待结果提交
 * @param page
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
          clearInterval(timer);
          resolve(true);
        }
      }, 100);
      return;
    }
    resolve(true);
  });
};
/**
 * @description 随机答题
 * @param page
 * @param questionType
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
export default handleExam;
