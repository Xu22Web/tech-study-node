import chalk from 'chalk';
import ora from 'ora';
import pup from 'puppeteer-core';
import { getTaskList } from './apis';
import STUDY_CONFIG from './config/study';
import handleExam from './controller/exam';
import handleLogin from './controller/login';
import handleReadNews from './controller/news';
import {
  renderScoreData,
  renderTasksData,
  renderUserData,
} from './controller/user';
import handleWatchVideo from './controller/video';
import { installMouseHelper, pushModal } from './utils';

// 处理浏览器
const handleBrowser = async (broswer: pup.Browser) => {
  // 打开新页面
  const page = await broswer.newPage();
  // 设置默认导航时间
  page.setDefaultNavigationTimeout(STUDY_CONFIG.timeout || 3000);
  //调试鼠标轨迹专用
  await installMouseHelper(page);
  // 进度
  const progress = ora();
  progress.info('用户登录');
  // 登录状态
  const loginStatus = await handleLogin(page);
  // 登录失败
  if (!loginStatus) {
    progress.fail(`超过最大重试次数,${chalk.blueBright('用户登录')}失败!`);
    // 推送学习提示
    pushModal({
      title: '学习提示',
      content: '超过最大重试次数, 用户登录失败!',
      type: 'fail',
    });
    return;
  }
  progress.info('用户基础信息');
  // 用户信息数据
  const userInfo = await renderUserData(page);
  // 用户积分数据
  let scoreInfo = await renderScoreData(page);
  if (userInfo && scoreInfo) {
    // 积分信息
    const { score, totalScore } = scoreInfo;
    // 推送学习提示
    pushModal({
      title: '学习提示',
      content: [
        '学习强国, 登录成功!',
        `当天积分:  <span style="color: #1890ff">${score}</span> 分`,
        `总积分: <span style="color: #1890ff">${totalScore}</span> 分`,
      ],
      type: 'success',
    });
  }
  // 用户任务进度数据
  await renderTasksData(page);
  // 学习
  await study(page);
  // 用户积分数据
  scoreInfo = await renderScoreData(page);
  progress.succeed('所有任务已完成!');

  if (userInfo && scoreInfo) {
    // 积分信息
    const { score, totalScore } = scoreInfo;
    // 推送学习提示
    pushModal({
      title: '学习提示',
      content: [
        '学习强国, 学习完成!',
        `当天积分:  <span style="color: #1890ff">${score}</span> 分`,
        `总积分: <span style="color: #1890ff">${totalScore}</span> 分`,
      ],
      type: 'success',
    });
  }
};
/**
 * @description 学习
 * @param page
 */
const study = async (page: pup.Page) => {
  // 任务进度
  const taskList = await getTaskList(page);
  // 进度
  const progress = ora();
  // 是否读新闻
  if (STUDY_CONFIG.settings[0] && !taskList[0].status) {
    progress.info(`任务一: ${chalk.blueBright('文章选读')} 开始`);
    // 读新闻
    await handleReadNews(page);
  }
  progress.succeed(`任务一: ${chalk.blueBright('文章选读')} 已完成!`);
  // 是否看视频
  if (STUDY_CONFIG.settings[1] && !taskList[1].status) {
    progress.info(`任务二: ${chalk.blueBright('视听学习')} 开始`);
    // 看视频
    await handleWatchVideo(page);
  }
  progress.succeed(`任务二: ${chalk.blueBright('视听学习')} 已完成!`);

  // // 是否每日答题
  if (STUDY_CONFIG.settings[2] && !taskList[2].status) {
    progress.info(`任务三: ${chalk.blueBright('每日答题')} 开始`);
    // 每日答题
    const res = await handleExam(page, 0);
    if (!res) {
      progress.fail(`任务三: ${chalk.blueBright('每日答题')} 答题出错!`);
    }
  }
  progress.succeed(`任务三: ${chalk.blueBright('每日答题')} 已完成!`);
  // // 是否每日答题
  if (STUDY_CONFIG.settings[3] && !taskList[3].status) {
    progress.info(`任务四: ${chalk.blueBright('每周答题')} 开始`);
    // 每日答题
    const res = await handleExam(page, 1);
    if (!res) {
      progress.fail(`任务四: ${chalk.blueBright('每周答题')} 答题出错!`);
    }
  }
  progress.succeed(`任务四: ${chalk.blueBright('每周答题')} 已完成!`);
  // // 是否每日答题
  if (STUDY_CONFIG.settings[4] && !taskList[4].status) {
    progress.info(`任务五: ${chalk.blueBright('专项练习')} 开始`);
    // 每日答题
    const res = await handleExam(page, 2);
    if (!res) {
      progress.fail(`任务五: ${chalk.blueBright('专项练习')} 答题出错!`);
    }
  }
  progress.succeed(`任务五: ${chalk.blueBright('专项练习')} 已完成!`);
};

export default handleBrowser;
