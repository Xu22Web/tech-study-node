/**
 * @description API 配置
 */
const API_CONFIG = {
  /**
   * @description 用户信息
   */
  userInfo: 'https://pc-api.xuexi.cn/open/api/user/info',
  /**
   * @description 总分
   */
  totalScore: 'https://pc-proxy-api.xuexi.cn/delegate/score/get',
  /**
   * @description 当天分数
   */
  todayScore: 'https://pc-proxy-api.xuexi.cn/delegate/score/today/query',
  /**
   * @description 任务列表
   */
  taskList:
    'https://pc-proxy-api.xuexi.cn/delegate/score/days/listScoreProgress?sence=score&deviceType=2',
  /**
   * @description 新闻数据
   */
  news: [
    'https://www.xuexi.cn/lgdata/35il6fpn0ohq.json',
    'https://www.xuexi.cn/lgdata/1ap1igfgdn2.json',
    'https://www.xuexi.cn/lgdata/vdppiu92n1.json',
    'https://www.xuexi.cn/lgdata/152mdtl3qn1.json'
  ],
  /**
   * @description 视频数据
   */
  video: [
    'https://www.xuexi.cn/lgdata/525pi8vcj24p.json',
    'https://www.xuexi.cn/lgdata/11vku6vt6rgom.json',
    'https://www.xuexi.cn/lgdata/2qfjjjrprmdh.json',
    'https://www.xuexi.cn/lgdata/3o3ufqgl8rsn.json',
    'https://www.xuexi.cn/lgdata/591ht3bc22pi.json',
    'https://www.xuexi.cn/lgdata/1742g60067k.json',
    'https://www.xuexi.cn/lgdata/1novbsbi47k.json'
  ],
  /**
   * @description 专项练习列表
   */
  paperList: 'https://pc-proxy-api.xuexi.cn/api/exam/service/paper/pc/list',
  /**
   * @description  文本服务器保存答案
   */
  answerSave: 'https://a6.qikekeji.com/txt/data/save',
  /**
   * @description 答案搜素
   */
  answerSearch: 'https://a6.qikekeji.com/txt/data/detail',
  /**
   * @description 推送
   */
  push: 'http://www.pushplus.plus/send',
};

export default API_CONFIG;
