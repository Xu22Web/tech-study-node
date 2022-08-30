/**
 * @description pushplus 推送配置
 * @link {@link https://www.pushplus.plus/ PushPlus 官网}
 */
const PUSH_CONFIG = {
  /**
   * @description 启用推送
   * @example true 启用推送 false 禁用推送
   */
  enabled: false,
  /**
   * @description 发送服务消息昵称
   */
  nick: '管理员',
  /**
   * @description 发送服务消息来源
   */
  from: '卑微的服务器',
  /**
   * @description 自己的token
   */
  token: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  /**
   * @description 加自己为好友的token
   */
  toToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  /**
   * @description 好友发送列表
   * @link {@link https://www.pushplus.plus/liaison.html PushPlus 好友消息}
   */
  list: [
    {
      nick: 'xxx',
      token: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      cron: '0 0 12 * * ?',
    },
  ],
};
export default PUSH_CONFIG;
