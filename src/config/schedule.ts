import { Log } from '../utils/logs';

const scheduleConfigLogger = new Log();

scheduleConfigLogger.start();

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
   * @example [文章选读, 视听学习, 每日答题]
   */
  taskConfig: [boolean, boolean, boolean];
  /**
   * @description 刷新页面 cookie 的随机时间间隔，单位为分钟页面 cookie 过期时间大概是 4 个小时，设置小于 4 个小时都行
   * @example  [60, 120] 则表示随机取 60 ~ 120 分钟刷新一次
   */
  refreshCookieInterval: [number, number];
};

const myScheduleConfig: Schedule[] = [];

const envScheduleConfig = process.env.SCHEDULE_CONFIG;

scheduleConfigLogger.info(`GET config: ${process.env.SCHEDULE_CONFIG}`);

if (typeof envScheduleConfig === 'string') {
  try {
    // 这里不保证参数的正确性，如果是错误参数则后面流程中进行校验
    const configData = JSON.parse(envScheduleConfig);
    myScheduleConfig.push(configData);
    scheduleConfigLogger.info(`当前配置：${Object.keys(configData).map(configKey => `[${configKey}: ${configData[configKey]}]`).join('\t')}`);
  } catch (error) {
    scheduleConfigLogger.fail('任务参数可能不是有效的 JSON 字符串，请检查 ENV 参数。');
  }
} else {
  scheduleConfigLogger.fail('任务参数不合法，请检查 ENV 参数。');
}

scheduleConfigLogger.finish();

/**
 * @description 定时任务配置
 */
export const SCHEDULE_CONFIG: Schedule[] = myScheduleConfig;
