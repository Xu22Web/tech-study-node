import chalk from 'chalk';
import { taskProgress, todayScore, totalScore, userInfo } from '../apis';
import shared from '../shared';
import {
  formatTask,
  getCookieIncludesDomain,
  stringfyCookie,
} from '../utils/utils';

/**
 * @description 用户信息
 */
export type UserInfo = {
  uid: number;
  nick: string;
  avatarMediaUrl: string | null;
  gmtActive: number;
  orgIds: number[];
};

/**
 * @description 任务列表
 */
export type TaskList = {
  currentScore: number;
  dayMaxScore: number;
  status: boolean;
  title: string;
  type: TaskType;
}[];

/**
 * @description 任务类型
 */
export enum TaskType {
  LOGIN,
  READ,
  WATCH,
  PRACTICE,
}

/**
 * @description 渲染用户信息
 * @param userInfo
 * @returns
 */
export const renderUserData = (userInfo: UserInfo) => {
  shared.log.warn(`用户信息`);
  shared.log.info(`用户名: ${chalk.yellow(userInfo.nick)}`);
};

/**
 * @description 渲染用户积分数据
 * @returns
 */
export const renderScoreData = (score: number, total: number) => {
  shared.log.warn(`积分信息`);
  shared.log.info(
    `当天积分: ${chalk.yellow(score)} 分 | 总积分: ${chalk.yellow(total)} 分`
  );
};
/**
 * @description 渲染用户任务数据
 * @param taskList
 */
export const renderTasksData = (taskList: TaskList) => {
  shared.log.warn(`任务进度`);
  taskList.forEach((task) =>
    shared.log.info(
      `${task.title}: ${chalk.yellow(task.currentScore)} / ${task.dayMaxScore}`
    )
  );
};

/**
 * @description 获取用户信息
 */
export const getUserInfo = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return;
  }
  try {
    // 获取 cookies
    const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
    //
    const cookie = stringfyCookie(cookies);
    // 用户信息
    const data: UserInfo = await userInfo(cookie);
    if (data) {
      return data;
    }
  } catch (e) {}
  return;
};

/**
 * @description 获取总积分
 */
export const getTotalScore = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return;
  }
  try {
    // 获取 cookies
    const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
    // 字符串化 cookie
    const cookie = stringfyCookie(cookies);
    // 总分
    const res = await totalScore(cookie);
    if (res) {
      // 总分
      const { score } = res;
      return <number>score;
    }
  } catch (e) {}
};

/**
 * @description 获取当天总积分
 */
export const getTodayScore = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return;
  }
  try {
    // 获取 cookies
    const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
    // cookie
    const cookie = stringfyCookie(cookies);
    // 当天分数
    const data = await todayScore(cookie);
    if (data) {
      // 总分
      const { score } = data;
      return <number>score;
    }
  } catch (e) {}
};

/**
 * @description 获取任务列表
 */
export const getTaskList = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return;
  }

  try {
    // 获取 cookies
    const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
    // cookie
    const cookie = stringfyCookie(cookies);
    // 任务进度
    const data = await taskProgress(cookie);
    // 请求成功
    if (data) {
      // 进度和当天总分
      const { taskProgress: progess }: { taskProgress: any[] } = data;
      // 进度存在
      if (progess && progess.length) {
        // 进度
        const taskProgress = progess.map(formatTask);
        // 任务列表
        const taskList: TaskList = [];
        // 文章选读
        taskList[TaskType.LOGIN] = {
          title: '登录',
          ...taskProgress[2],
          type: TaskType.LOGIN,
        };
        // 文章选读
        taskList[TaskType.READ] = {
          title: '文章选读',
          ...taskProgress[0],
          type: TaskType.READ,
        };
        // 视听学习
        taskList[TaskType.WATCH] = {
          title: '视听学习',
          ...taskProgress[1],
          type: TaskType.WATCH,
        };
        // 每日答题
        taskList[TaskType.PRACTICE] = {
          title: '每日答题',
          ...taskProgress[3],
          type: TaskType.PRACTICE,
        };
        return taskList;
      }
    }
  } catch (e) {}
};
