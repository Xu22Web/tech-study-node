import { Schedule } from '../utils/job';

/**
 * @description 定时任务配置
 */
export const SCHEDULE_CONFIG: Schedule[] = [
  {
    nick: 'xxx',
    token: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    cron: '0 0 12 * * ?',
    taskConfig: [true, true, true, true],
    paperExitAfterWrong: false,
    refreshCookieInterval: [60, 120],
  },
];
