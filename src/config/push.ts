/**
 * @description pushplus 推送配置
 * @link {@link https://www.pushplus.plus/ PushPlus 官网}
 */
const PUSH_CONFIG = {
  /**
   * @description 启用推送
   * @example true 启用推送 false 禁用推送
   */
  enabled: process.env.PUSH_PLUS_ENABLED === 'true',
  /**
   * @description 发送服务消息昵称
   */
  nick: process.env.PUSH_PLUS_NICK || '管理员',
  /**
   * @description 发送服务消息来源
   */
  from: process.env.PUSH_PLUS_SERVER_NAME || 'tech-study-node',
  /**
   * @description 管理员的token
   */
  token: process.env.PUSH_PLUS_ADMIN_TOKEN || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
};
export default PUSH_CONFIG;
