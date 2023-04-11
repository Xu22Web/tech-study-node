import chalk from 'chalk';
import handleExam from './controller/exam';
import handleLogin, { handleLoginByCacheCookie } from './controller/login';
import {
  renderScoreData,
  renderTasksData,
  renderUserData,
  TaskType,
} from './controller/user';
import handleWatch from './controller/watch';
import shared from './shared';
import { getHighlightHTML, getProgressHTML } from './utils/html';
import { StudyParams } from './utils/job';

/**
 * @description 处理学习
 * @returns
 */
export const handleStudy = async () => {
  shared.log.info('用户登录!');
  // 登录状态
  const status = await handleLogin();
  // 登录失败
  if (!status) {
    shared.log.fail('超过重试次数,登录失败!');
    // 推送学习提示
    shared.pushModal({
      title: '学习提示',
      content: '超过最大重试次数, 用户登录失败!',
      type: 'fail',
    });
    return;
  }
  shared.log.success('登录成功!');
  // 用户信息
  await shared.getUserInfo();
  // 总分
  await shared.getTotalScore();
  // 当天
  await shared.getTodayScore();
  // 任务进度
  await shared.getTaskList();
  if (
    shared.userInfo &&
    shared.totalScore !== undefined &&
    shared.todayScore !== undefined &&
    shared.taskList
  ) {
    shared.log.info('学习开始!');
    // 用户信息数据
    await renderUserData(shared.userInfo);
    // 用户积分数据
    await renderScoreData(shared.todayScore, shared.totalScore);
    // 用户任务进度数据
    await renderTasksData(shared.taskList);
    // 推送学习提示
    shared.pushModal({
      title: '学习提示',
      content: [
        '学习强国, 登录成功!',
        `当天积分:  ${getHighlightHTML(shared.todayScore)} 分`,
        `总积分: ${getHighlightHTML(shared.totalScore)} 分`,
        ...shared.taskList.map((task) =>
          getProgressHTML(task.title, task.rate)
        ),
      ],
      type: 'success',
    });
    // 学习
    await study();
    // 总分
    await shared.getTotalScore();
    // 当天
    await shared.getTodayScore();
    // 任务进度
    await shared.getTaskList();
    if (
      shared.totalScore !== undefined &&
      shared.todayScore !== undefined &&
      shared.taskList
    ) {
      shared.log.info('学习完成!');
      // 用户信息数据
      await renderUserData(shared.userInfo);
      // 用户积分数据
      await renderScoreData(shared.todayScore, shared.totalScore);
      // 用户任务进度数据
      await renderTasksData(shared.taskList);
      // 推送学习提示
      shared.pushModal({
        title: '学习提示',
        content: [
          '学习强国, 学习完成!',
          `当天积分:  ${getHighlightHTML(shared.todayScore)} 分`,
          `总积分: ${getHighlightHTML(shared.totalScore)} 分`,
          ...shared.taskList.map((task) =>
            getProgressHTML(task.title, task.rate)
          ),
        ],
        type: 'success',
      });
    }
  }
};

/**
 * @description 学习
 */
const study = async () => {
  // 任务进度
  await shared.getTaskList();
  if (shared.taskList) {
    // 是否读新闻
    if (
      (<StudyParams>shared.params).taskConfig[TaskType.READ] &&
      !shared.taskList[TaskType.READ].status
    ) {
      shared.log.info(`任务一: ${chalk.blueBright('文章选读')} 开始`);
      // 读新闻
      await handleWatch(0);
    }
    shared.log.success(`任务一: ${chalk.blueBright('文章选读')} 已完成!`);

    // 是否看视频
    if (
      (<StudyParams>shared.params).taskConfig[TaskType.WATCH] &&
      !shared.taskList[TaskType.WATCH].status
    ) {
      shared.log.info(`任务二: ${chalk.blueBright('视听学习')} 开始`);
      // 看视频
      await handleWatch(1);
    }
    shared.log.success(`任务二: ${chalk.blueBright('视听学习')} 已完成!`);

    // 是否每日答题
    if (
      (<StudyParams>shared.params).taskConfig[TaskType.PRACTICE] &&
      !shared.taskList[TaskType.PRACTICE].status
    ) {
      shared.log.info(`任务三: ${chalk.blueBright('每日答题')} 开始`);
      // 每日答题
      const res = await handleExam(0);
      // 答题出错
      if (!res) {
        shared.log.fail(`任务三: ${chalk.blueBright('每日答题')} 答题出错!`);
      }
    }
    shared.log.success(`任务三: ${chalk.blueBright('每日答题')} 已完成!`);

    // 是否专项练习
    if (
      (<StudyParams>shared.params).taskConfig[TaskType.PAPER] &&
      !shared.taskList[TaskType.PAPER].status
    ) {
      shared.log.info(`任务四: ${chalk.blueBright('专项练习')} 开始`);
      // 专项练习
      const res = await handleExam(1);
      // 答题出错
      if (!res) {
        shared.log.fail(`任务四: ${chalk.blueBright('专项练习')} 答题出错!`);
      }
    }
    shared.log.success(`任务四: ${chalk.blueBright('专项练习')} 已完成!`);
    return;
  }
  // 重新学习
  await study();
};

/**
 * @description 处理刷新
 * @returns
 */
export const handleRefresh = async () => {
  const res = await handleLoginByCacheCookie();
  if (!res) {
    // 推送学习提示
    shared.pushModal({
      title: '刷新提示',
      content: '学习强国, 刷新 cookie 失败!',
      type: 'fail',
    });
  }
  return res;
};
