import chalk from 'chalk';
import ora from 'ora';
import pup from 'puppeteer-core';
// API
import {
  getTaskList,
  getTodayScore,
  getTotalScore,
  getUserInfo,
} from '../apis';
/**
 * @description 渲染用户信息
 * @param page
 * @returns
 */
export const renderUserData = async (page: pup.Page) => {
  // 用户信息 加载
  const userProgress = ora('正在获取用户信息...');
  userProgress.start();
  // 用户信息
  const userInfo = await getUserInfo(page);
  if (userInfo) {
    userProgress.succeed('获取用户信息成功!');
    userProgress.warn(`用户信息`);
    userProgress.info(`昵称: ${chalk.yellow(userInfo.nick)}\n`);
    return userInfo;
  }
  userProgress.fail('获取用户信息失败!');
};

/**
 * @description 渲染用户积分数据
 * @param page
 * @returns
 */
export const renderScoreData = async (page: pup.Page) => {
  // 积分信息 加载
  const scoreProgress = ora('正在获取积分信息...');
  scoreProgress.start();
  // 分数
  const score = await getTodayScore(page);
  // 总分
  const totalScore = await getTotalScore(page);
  if (score !== undefined && totalScore !== undefined) {
    scoreProgress.succeed('获取积分信息成功!');
    scoreProgress.warn(`积分信息`);
    scoreProgress.info(
      `当天积分: ${chalk.yellow(score)} 分 | 总积分: ${chalk.yellow(
        totalScore
      )} 分\n`
    );
    return {
      score,
      totalScore,
    };
  }
  scoreProgress.fail('获取积分信息失败!');
};
/**
 * @description 渲染用户任务数据
 * @param page
 */
export const renderTasksData = async (page: pup.Page) => {
  // 任务进度 加载
  const taskProgress = ora('正在获取任务进度...');
  taskProgress.start();
  // 任务进度
  const taskList = await getTaskList(page);
  if (taskList && taskList.length) {
    taskProgress.succeed(`获取${chalk.blueBright('任务进度')}成功!`);
    taskProgress.warn(`任务进度`);
    taskProgress.info(`文章选读: ${chalk.yellow(taskList[0].rate)} %`);
    taskProgress.info(`视听学习: ${chalk.yellow(taskList[1].rate)} %`);
    taskProgress.info(`每日答题: ${chalk.yellow(taskList[2].rate)} %`);
    taskProgress.info(`每周答题: ${chalk.yellow(taskList[3].rate)} %`);
    taskProgress.info(`专项练习: ${chalk.yellow(taskList[4].rate)} %\n`);
    return taskList;
  }
  taskProgress.fail('获取任务进度失败!');
};
