/**
 * @description 学习配置
 */
const STUDY_CONFIG = {
  /**
   * @description 通用超时
   */
  timeout: 10000,
  /**
   * @description 最大登录尝试次数
   */
  maxTryLoginCount: 10,
  /**
   * @description 最大登录等待时间
   */
  loginTimeout: 80000,
  /**
   * @description 登录二维码本地存储（开启推送后，自行关闭）
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
   * @description 登录后 cookie 缓存路径
   */
  cookieCachePath: 'src/cookie/',
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
   * @description 限制请求速率
   */
  rateLimit: 3000,
  /**
   * @description 专项练习的开启逆序
   * @example true 逆序 false 顺序
   */
  paperReverse: true,
};

export default STUDY_CONFIG;
