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
  totalScore: 'https://pc-api.xuexi.cn/open/api/score/get',
  /**
   * @description 当天分数
   */
  todayScore: 'https://pc-api.xuexi.cn/open/api/score/today/query',
  /**
   * @description 任务列表
   */
  taskList:
    'https://pc-proxy-api.xuexi.cn/api/score/days/listScoreProgress?sence=score&deviceType=2',
  /**
   * @description 新闻数据
   */
  todayNews: [
    'https://www.xuexi.cn/lgdata/1jscb6pu1n2.json',
    'https://www.xuexi.cn/lgdata/1ap1igfgdn2.json',
  ],
  /**
   * @description 视频数据
   */
  todayVideos: [
    'https://www.xuexi.cn/lgdata/3o3ufqgl8rsn.json',
    'https://www.xuexi.cn/lgdata/1742g60067k.json',
  ],
  /**
   * @description 每周答题列表
   */
  weeklyList:
    'https://pc-proxy-api.xuexi.cn/api/exam/service/practice/pc/weekly/more',
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
  answerSearch: [
    'https://a6.qikekeji.com/txt/data/detail',
    'http://www.syiban.com/search/index/init.html',
    'https://www.souwen123.com/search/select.php',
  ],
};

export default API_CONFIG;
