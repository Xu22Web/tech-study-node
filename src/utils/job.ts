import paser from 'cron-parser';
import { SCHEDULE_CONFIG } from '../config/schedule';
import { existsCookieCache } from './cookieCache';

/**
 * @description 定时任务
 */
export type Schedule = {
  /**
   * @description 用户昵称
   */
  nick: string;
  /**
   * @description 用户token
   * @link {@link https://www.pushplus.plus/liaison.html 好友消息}
   */
  token: string;
  /**
   * @description 定时时间
   */
  cron: string;
  /**
   * @description 学习任务配置
   * @example [文章选读, 视听学习, 每日答题, 专项练习]
   */
  taskConfig: [boolean, boolean, boolean, boolean];
  /**
   * @description 专项练习 答题失败（由于答完结算，仅包含答题异常或无答案）是否退出不提交
   * @example true 退出答题不提交 false 继续答题
   */
  paperExitAfterWrong: boolean;
  /**
   * @description 刷新页面 cookie 的随机时间间隔，单位为分钟页面 cookie 过期时间大概是 4 个小时，设置小于 4 个小时都行
   * @example  [60, 120] 则表示随机取 60 ~ 120 分钟刷新一次
   */
  refreshCookieInterval: [number, number];
};

/**
 * @description 学习参数
 */
export type StudyParams = Omit<Schedule, 'cron' | 'refreshCookieInterval'>;

/**
 * @description 刷新参数
 */
export type RefreshParams = Pick<Schedule, 'token'> & {
  cookieId: string;
};

/**
 * @description 学习任务
 */
export interface StudyJob {
  time: number;
  type: 'study';
  params: StudyParams;
}

/**
 * @description 刷新任务
 */
export interface RefreshJob {
  time: number;
  type: 'freshCookie';
  effective: boolean;
  params: RefreshParams;
}

// 任务
export type Job = StudyJob | RefreshJob;

/**
 * @description 生成当前时间到下次学习任务的刷新任务
 * @param options
 * @returns
 */
export const generateRefreshJobs = (studyJob: StudyJob) => {
  // 任务信息
  const { time: endTime, params } = studyJob;
  // 任务参数
  const { token, nick: cookieId } = params;
  // 刷新间隔
  const { refreshCookieInterval: intervalRange } = SCHEDULE_CONFIG.find(
    (schedule) => schedule.nick === cookieId
  )!;
  // 当前时间
  const now = Date.now();
  // 单位
  const unit = 1000 * 60;

  // 随机刷新任务
  const refreshJobs: RefreshJob[] = [];
  // 当前任务时间
  let currentJobTime = endTime;
  // 至少相差 30min
  while (currentJobTime > now + 30 * unit) {
    // 随机间隔时间
    const intervalTime =
      (Math.random() * (intervalRange[1] - intervalRange[0]) +
        intervalRange[0]) *
      unit;
    // 当前任务时间
    currentJobTime -= intervalTime;
    refreshJobs.push({
      time: currentJobTime,
      type: 'freshCookie',
      effective: true,
      params: { cookieId, token },
    });
  }
  refreshJobs.sort((a, b) => a.time - b.time);
  return refreshJobs;
};

/**
 * @description 创建学习任务
 * @param scheduleList
 * @returns
 */
export const createStudyJobs = (scheduleList: Schedule[]) => {
  // 学习任务
  const studyJobs: StudyJob[] = [];

  scheduleList.forEach((schedule) => {
    const { cron } = schedule;
    const time = paser.parseExpression(cron).next().getTime();
    studyJobs.push({
      params: schedule,
      time,
      type: 'study',
    });
  });

  return studyJobs;
};

/**
 * @description 创建刷新任务
 * @param studyJobs
 * @returns
 */
export const createRefreshJobs = (studyJobs: StudyJob[]) => {
  // 缓存 cookie 信息
  const cache = new Map<string, boolean>();
  // 刷新任务
  const refreshJobs = studyJobs
    .map((studyJob) => {
      // 任务信息
      const { nick } = studyJob.params;
      // 避免反复检查
      if (!cache.has(nick)) {
        // 存在缓存
        const exists = existsCookieCache(nick);
        cache.set(nick, exists);
        // 缓存 cookie 不存在
        if (!exists) {
          return;
        }
      } else {
        // 缓存 cookie 不存在
        if (!cache.get(nick)) {
          return;
        }
      }
      return generateRefreshJobs(studyJob);
    })
    .flat()
    .filter<RefreshJob>((job): job is RefreshJob => !!job);
  return refreshJobs;
};

/**
 * @description 创建任务
 * @param scheduleList
 * @returns
 */
export const createJobs = (scheduleList: Schedule[]) => {
  // 学习任务
  const studyJobs = createStudyJobs(scheduleList);
  // 刷新任务
  const refreshJobs = createRefreshJobs(studyJobs);
  // 所有任务
  const jobs: Job[] = [...refreshJobs, ...studyJobs];
  // 时间排序
  jobs.sort((a, b) => a.time - b.time);
  return { jobs, studyJobs, refreshJobs };
};
