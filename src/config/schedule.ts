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
  cron: string | string[];
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
