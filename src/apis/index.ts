import axios from 'axios';
import API_CONFIG from '../config/api';

/**
 * @description 用户信息
 * @param cookie
 * @returns
 */
export const userInfo = async (cookie: string) => {
  try {
    // 用户信息
    const res = await axios.get(API_CONFIG.userInfo, {
      withCredentials: true,
      headers: {
        Cookie: cookie,
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res.data;
      return data;
    }
  } catch (err: any) {}
  return;
};

/**
 * @description 总积分
 * @param cookie
 * @returns
 */
export const totalScore = async (cookie: string) => {
  try {
    // 当天总分
    const res = await axios.get(API_CONFIG.totalScore, {
      withCredentials: true,
      headers: {
        Cookie: cookie,
      },
    });

    // 请求成功
    if (res.status === 200) {
      const { data } = res.data;
      return data;
    }
  } catch (err: any) {}
  return;
};

/**
 * @description 当天总积分
 * @param cookie
 * @returns
 */
export const todayScore = async (cookie: string) => {
  try {
    // 当天分数
    const res = await axios.get(API_CONFIG.todayScore, {
      withCredentials: true,
      headers: {
        Cookie: cookie,
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res.data;
      return data;
    }
  } catch (err: any) {}
  return;
};

/**
 * @description 获取任务列表
 * @param cookie
 * @returns
 */
export const taskProgress = async (cookie: string) => {
  try {
    // 任务进度
    const res = await axios.get(API_CONFIG.taskList, {
      withCredentials: true,
      headers: {
        Cookie: cookie,
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res.data;
      return data;
    }
  } catch (err: any) {}
  return;
};

/**
 * @description 新闻数据
 * @returns
 */
export const newsList = async () => {
  // 随机
  const randNum = ~~(Math.random() * API_CONFIG.news.length);
  try {
    // 获取新闻
    const res = await axios.get(API_CONFIG.news[randNum]);
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (err: any) {}
  return;
};
/**
 * @description 视频数据
 */
export const videoList = async () => {
  // 随机
  const randNum = ~~(Math.random() * API_CONFIG.video.length);
  try {
    // 获取视频
    const res = await axios.get(API_CONFIG.video[randNum]);
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (err: any) {}
  return;
};

/**
 * @description 专项练习数据
 * @param cookie
 * @param pageNo
 * @returns
 */
export const examPaper = async (cookie: string, pageNo: number) => {
  try {
    // 获取专项练习
    const res = await axios.get(API_CONFIG.paperList, {
      withCredentials: true,
      headers: {
        Cookie: cookie,
      },
      params: {
        pageSize: 50,
        pageNo,
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (e) {}
};

/**
 * @description 保存答案
 * @param body
 * @returns
 */
export const postAnswer = async (body: string) => {
  try {
    // 保存答案
    const res = await axios.post(API_CONFIG.answerSave, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (e) {}
};

/**
 * @description 获取答案
 * @param question
 * @returns
 */
export const getAnswer = async (body: any) => {
  try {
    // 保存答案
    const res = await axios.post(API_CONFIG.answerSearch, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (e) {}
};

/**
 * @description 推送
 * @param token
 * @param title
 * @param content
 * @param template
 * @param to
 * @returns
 */
export const pushPlus = async (
  token: string,
  title: string,
  content: string,
  template: string,
  toToken?: string
) => {
  try {
    // 参数体
    const body: {
      token: string;
      title: string;
      content: string;
      template: string;
      to?: string;
    } = {
      token,
      title,
      content,
      template,
    };
    // 好友令牌
    if (toToken) {
      body.to = toToken;
    }
    // 推送
    const res = await axios.post(API_CONFIG.push, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // 请求成功
    if (res.status === 200) {
      const { data } = res;
      return data;
    }
  } catch (error) {}
};
