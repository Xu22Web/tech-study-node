import paser from 'cron-parser';
import { SCHEDULE_CONFIG, Schedule } from '../config/schedule';
import { existsCookieCache } from './cookieCache';

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
  // 任务参数
  const { token, nick: cookieId } = studyJob.params;
  // 刷新间隔
  const { refreshCookieInterval: intervalRange, cron } = SCHEDULE_CONFIG.find(
    (schedule) => schedule.nick === cookieId
  )!;
  // 当前时间
  const now = Date.now();
  // 单位
  const unit = 1000 * 60;

  // 随机刷新任务
  const refreshJobs: RefreshJob[] = [];
  // 当前任务时间
  let currentJobTime = paser.parseExpression(cron).next().getTime();
  // 随机间隔时间
  let intervalTime =
    (Math.random() * (intervalRange[1] - intervalRange[0]) + intervalRange[0]) *
    unit;
  // 当前任务时间
  currentJobTime -= intervalTime;
  // 至少相差 30min
  while (currentJobTime > now + 10 * unit) {
    refreshJobs.push({
      time: currentJobTime,
      type: 'freshCookie',
      effective: true,
      params: { cookieId, token },
    });
    // 随机间隔时间
    intervalTime =
      (Math.random() * (intervalRange[1] - intervalRange[0]) +
        intervalRange[0]) *
      unit;
    // 当前任务时间
    currentJobTime -= intervalTime;
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
  // 检测昵称唯一性
  const res = scheduleList.some(
    (schedule) =>
      scheduleList.filter(
        (matchSchedule) => schedule.nick === matchSchedule.nick
      ).length > 1
  );
  if (res) {
    throw new Error('nick 必须唯一, 请重新配置');
  }
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
