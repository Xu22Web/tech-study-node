import chalk from 'chalk';
import pup from 'puppeteer-core';
import STUDY_CONFIG from './config/study';
import handleExam from './controller/exam';
import handleLogin from './controller/login';
import handleWatch from './controller/watch';
import {
  getTaskList,
  getTodayScore,
  getTotalScore,
  getUserInfo,
  renderScoreData,
  renderTasksData,
  renderUserData,
} from './controller/user';
import shared from './shared';

// 处理浏览器
const handleBrowser = async (browser: pup.Browser) => {
  // 设置浏览器
  shared.setBrowser(browser);
  // 打开页面
  await shared.openPage();
  shared.progress.info('用户登录');
  // 登录状态
  const status = await handleLogin();
  // 登录失败
  if (!status) {
    shared.progress.fail('超过重试次数,登录失败!');
    // 推送学习提示
    shared.pushModal({
      title: '学习提示',
      content: '超过最大重试次数, 用户登录失败!',
      type: 'fail',
    });
    return;
  }
  shared.progress.start('正在获取用户信息...');
  // 用户信息
  const userInfo = await getUserInfo();
  shared.progress.succeed('获取用户信息成功!');
  shared.progress.start('正在获取积分信息...');
  // 总分
  let total = await getTotalScore();
  // 当天
  let score = await getTodayScore();
  shared.progress.succeed('获取积分信息成功!');
  shared.progress.start('正在获取任务进度...');
  // 任务进度
  let taskList = await getTaskList();
  shared.progress.succeed('获取任务进度成功!');
  if (userInfo && total !== undefined && score !== undefined && taskList) {
    // 昵称
    shared.setNick(userInfo.nick);
    shared.progress.info('用户基础信息');
    // 用户信息数据
    await renderUserData(userInfo);
    // 用户积分数据
    await renderScoreData(score, total);
    // 用户任务进度数据
    await renderTasksData(taskList);
    // 推送学习提示
    shared.pushModal({
      title: '学习提示',
      content: [
        '学习强国, 登录成功!',
        `当天积分:  <span style="color: #1890ff">${score}</span> 分`,
        `总积分: <span style="color: #1890ff">${total}</span> 分`,
        `文章选读: <span style="color: #1890ff">${taskList[0].rate}</span> %`,
        `视听学习: <span style="color: #1890ff">${taskList[1].rate}</span> %`,
        `每日答题: <span style="color: #1890ff">${taskList[2].rate}</span> %`,
        `每周答题: <span style="color: #1890ff">${taskList[3].rate}</span> %`,
        `专项练习: <span style="color: #1890ff">${taskList[4].rate}</span> %`,
      ],
      type: 'success',
    });
    // 学习
    await study();
    // 总分
    total = await getTotalScore();
    // 当天
    score = await getTodayScore();
    // 任务进度
    taskList = await getTaskList();
    if (total !== undefined && score !== undefined && taskList) {
      // 推送学习提示
      shared.pushModal({
        title: '学习提示',
        content: [
          '学习强国, 学习完成!',
          `当天积分:  <span style="color: #1890ff">${score}</span> 分`,
          `总积分: <span style="color: #1890ff">${total}</span> 分`,
          `文章选读: <span style="color: #1890ff">${taskList[0].rate}</span> %`,
          `视听学习: <span style="color: #1890ff">${taskList[1].rate}</span> %`,
          `每日答题: <span style="color: #1890ff">${taskList[2].rate}</span> %`,
          `每周答题: <span style="color: #1890ff">${taskList[3].rate}</span> %`,
          `专项练习: <span style="color: #1890ff">${taskList[4].rate}</span> %`,
        ],
        type: 'success',
      });
    }
  }

  // 学习
};
/**
 * @description 学习

 */
const study = async () => {
  // 任务进度
  const taskList = await getTaskList();
  if (taskList) {
    // 是否读新闻
    if (STUDY_CONFIG.settings[0] && !taskList[0].status) {
      shared.progress.info(`任务一: ${chalk.blueBright('文章选读')} 开始`);
      // 读新闻
      await handleWatch(0);
    }
    shared.progress.succeed(`任务一: ${chalk.blueBright('文章选读')} 已完成!`);

    // 是否看视频
    if (STUDY_CONFIG.settings[1] && !taskList[1].status) {
      shared.progress.info(`任务二: ${chalk.blueBright('视听学习')} 开始`);
      // 看视频
      await handleWatch(1);
    }
    shared.progress.succeed(`任务二: ${chalk.blueBright('视听学习')} 已完成!`);

    // 是否每日答题
    if (STUDY_CONFIG.settings[2] && !taskList[2].status) {
      shared.progress.info(`任务三: ${chalk.blueBright('每日答题')} 开始`);
      // 每日答题
      const res = await handleExam(0);
      // 答题出错
      if (!res) {
        shared.progress.fail(
          `任务三: ${chalk.blueBright('每日答题')} 答题出错!`
        );
      }
    }
    shared.progress.succeed(`任务三: ${chalk.blueBright('每日答题')} 已完成!`);

    // 是否每周答题
    if (STUDY_CONFIG.settings[3] && !taskList[3].status) {
      shared.progress.info(`任务四: ${chalk.blueBright('每周答题')} 开始`);
      // 每周答题
      const res = await handleExam(1);
      // 答题出错
      if (!res) {
        shared.progress.fail(
          `任务四: ${chalk.blueBright('每周答题')} 答题出错!`
        );
      }
    }
    shared.progress.succeed(`任务四: ${chalk.blueBright('每周答题')} 已完成!`);

    // 是否每日答题
    if (STUDY_CONFIG.settings[4] && !taskList[4].status) {
      shared.progress.info(`任务五: ${chalk.blueBright('专项练习')} 开始`);
      // 专项练习
      const res = await handleExam(2);
      // 答题出错
      if (!res) {
        shared.progress.fail(
          `任务五: ${chalk.blueBright('专项练习')} 答题出错!`
        );
      }
    }
    shared.progress.succeed(`任务五: ${chalk.blueBright('专项练习')} 已完成!`);
  }
};

export default handleBrowser;
