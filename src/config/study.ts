/**
 * @description 学习配置
 */

const STUDY_CONFIG = {
  /**
   * @description 通用超时
   */
  timeout: 10000,
  /**
   * @description 最大登录重试次数
   */
  maxRetryLoginCount: 8,
  /**
   * @description 最大登录等待时间
   */
  loginTimeout: 60000,
  /**
   * @description 登录二维码本地存储
   */
  qrcodeLocalEnabled: true,
  /**
   * @description 登录二维码保存路径
   */
  qrcodePath: 'src/qrcode/',
  /**
   * @description 登录结束自动清理二维码
   */
  qrcodeAutoClean: true,
  /**
   * @description 日志保存路径
   */
  logsPath: 'src/logs/',
  /**
   * @description 日志自动清理间隔天数
   */
  logsAutoCleanInterval: 7,
  /**
   * @description 单次最大新闻数
   */
  maxNewsNum: 6,
  /**
   * @description 单次最大视频数
   */
  maxVideoNum: 6,
  /**
   * @description 每周答题的顺序
   * @example true 逆序 false 顺序
   */
  weeklyReverse: true,
  /**
   * @description 专项练习的顺序
   * @example true 逆序 false 顺序
   */
  paperReverse: true,
  /**
   * @description 限制请求速率
   */
  rateLimit: 3000,
  /**
   * @description 每周答题 答题失败是否退出不提交
   * @example true 答题失败退出答题不提交 false 继续答题
   */
  weeklyExitAfterWrong: false,
  /**
   * @description 专项练习 答题失败是否退出不提交
   * @example true 退出答题不提交 false 继续答题
   */
  paperExitAfterWrong: false,
  /**
   * @description 设置
   * @example 学习项目配置 = [文章选读, 视听学习, 每日答题, 每周答题, 专项练习]
   */
  settings: [true, true, true, true, true],
};

export default STUDY_CONFIG;
