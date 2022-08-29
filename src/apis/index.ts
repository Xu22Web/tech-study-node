import axios from 'axios';
import pup from 'puppeteer-core';
import API_CONFIG from '../config/api';
import { formatTask, getCookieIncludesDomain, stringfyCookie } from '../utils';
/**
 * @description 用户信息
 */
export type UserInfo = {
  uid: number;
  nick: string;
  avatarMediaUrl: string | null;
  gmtActive: number;
  orgIds: number[];
};
/**
 * @description 任务列表
 */
export type TaskList = {
  currentScore: number;
  dayMaxScore: number;
  rate: number;
  need: number;
  status: boolean;
}[];
/**
 * @description 新闻视频列表
 */
export type NewsOrVideoList = {
  publishTime: string;
  title: string;
  type: string;
  url: string;
  showSource: string;
  auditTime: string;
  dataValid: true;
}[];
/**
 * @description 答案数据
 */
export type AnswerData = {
  status: number;
  data: {
    txt_content: string;
  };
  error: string;
};

/**
 * @description 获取用户信息
 */
export const getUserInfo = async (page: pup.Page) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
  // 用户信息
  const res = await axios.get(API_CONFIG.userInfo, {
    withCredentials: true,
    headers: {
      Cookie: cookie,
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res.data;
      return <UserInfo>data;
    } catch (error) {}
  }
};
/**
 * @description 获取总积分
 */
export const getTotalScore = async (page: pup.Page) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
  // 当天总分
  const res = await axios.get(API_CONFIG.totalScore, {
    withCredentials: true,
    headers: {
      Cookie: cookie,
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res.data;
      // 总分
      const { score } = data;
      return <number>score;
    } catch (error) {}
  }
};
/**
 * @description 获取当天总积分
 */
export const getTodayScore = async (page: pup.Page) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
  // 当天分数
  const res = await axios.get(API_CONFIG.todayScore, {
    withCredentials: true,
    headers: {
      Cookie: cookie,
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res.data;
      // 当天总分
      const { score } = data;
      return <number>score;
    } catch (error) {}
  }
  return 0;
};
/**
 * @description 获取任务列表
 */
export const getTaskList = async (page: pup.Page) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
  // 任务进度
  const res = await axios.get(API_CONFIG.taskList, {
    withCredentials: true,
    headers: {
      Cookie: cookie,
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res.data;
      // 进度和当天总分
      const { taskProgress: progess }: { taskProgress: any[] } = data;
      // 进度存在
      if (progess && progess.length) {
        // 进度
        const taskProgress = progess.map(formatTask);
        // 任务列表
        const taskList: TaskList = [];
        taskList[0] = taskProgress[0];
        // 合并 视听学习 视听学习时长
        const currentTemp =
          taskProgress[1].currentScore + taskProgress[3].currentScore;
        const maxTemp =
          taskProgress[1].dayMaxScore + taskProgress[3].dayMaxScore;
        taskList[1] = formatTask({
          currentScore: currentTemp,
          dayMaxScore: maxTemp,
        });
        taskList[2] = taskProgress[6];
        taskList[3] = taskProgress[2];
        taskList[4] = taskProgress[5];
        return taskList;
      }
    } catch (error) {}
  }
  return [];
};
/**
 * @description 获取新闻数据
 */
export const getNews = async () => {
  // 随机
  const randNum = ~~(Math.random() * 2);
  // 获取新闻
  const res = await axios.get(API_CONFIG.todayNews[randNum]);
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res;
      return <NewsOrVideoList>data;
    } catch (error) {}
  }
  return [];
};
/**
 * @description 获取视频数据
 */
export const getVideos = async () => {
  // 随机
  const randNum = ~~(Math.random() * 2);
  // 获取视频
  const res = await axios.get(API_CONFIG.todayVideos[randNum]);
  // 请求成功
  if (res.status === 200) {
    try {
      const { data } = res;
      return <NewsOrVideoList>data;
    } catch (error) {}
  }
  return [];
};

type ExamPractices = {
  id: number;
  questionNum: number;
  alreadyAnswerNum: number;
  tipScore: number;
  name: string;
  status: number;
  startDate: string;
}[];
/**
 * @description 每周答题数据
 */
export const getExamWeekly = async (page: pup.Page, pageNo: number) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
  // 获取专项练习
  const res = await axios.get(API_CONFIG.weeklyList, {
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
    try {
      const { data } = res;
      const paperJson = decodeURIComponent(
        escape(atob(data.data_str.replace(/-/g, '+').replace(/_/g, '/')))
      );
      // JSON格式化
      const paper = <
        {
          list: {
            practices: ExamPractices;
          }[];
          totalPageCount: number;
        }
      >JSON.parse(paperJson);
      return paper;
    } catch (err) {}
  }
};
/**
 * @description 专项练习数据
 */
export const getExamPaper = async (page: pup.Page, pageNo: number) => {
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, '.xuexi.cn');
  // cookie
  const cookie = stringfyCookie(cookies);
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
    try {
      const { data } = res;
      const paperJson = decodeURIComponent(
        escape(atob(data.data_str.replace(/-/g, '+').replace(/_/g, '/')))
      );
      // JSON格式化
      const paper = <
        {
          list: ExamPractices;
          totalPageCount: number;
        }
      >JSON.parse(paperJson);
      return paper;
    } catch (err) {}
  }
};

/**
 * @description 保存答案
 */
export const saveAnswer = async (key: string, value: string) => {
  // 内容
  const content = JSON.stringify([{ title: key, content: value }]);
  // 数据
  const data = {
    txt_name: key,
    txt_content: content,
    password: '',
    v_id: '',
  };
  // 数据键
  const dataKeys = Object.keys(data);
  // 请求体
  const body = dataKeys
    .map((key) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        data[<keyof typeof data>key]
      )}`;
    })
    .join('&');
  // 保存答案
  const res = await axios.post(API_CONFIG.answerSave, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const {
        data,
        status,
      }: { status: number; data: { txt_content: string; txt_name: string } } =
        res.data;
      if (status !== 0) {
        return data;
      }
    } catch (error) {}
  }
};
/**
 * @description 获取答案
 */
export const getAnswer = async (key: string) => {
  // 数据
  const data = {
    txt_name: key,
    password: '',
  };
  // 数据键
  const dataKeys = Object.keys(data);
  // 请求体
  const body = dataKeys
    .map((key) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(
        data[<keyof typeof data>key]
      )}`;
    })
    .join('&');

  // 保存答案
  const res = await axios.post(API_CONFIG.answerSearch[0], body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  // 请求成功
  if (res.status === 200) {
    try {
      const {
        data,
        status,
      }: { status: number; data: { txt_content: string; txt_name: string } } =
        res.data;
      if (status !== 0) {
        // 答案列表
        const answerList: { content: string; title: string }[] = JSON.parse(
          data.txt_content
        );
        // 答案
        const answers = answerList[0].content.split(';');
        return answers;
      }
    } catch (error) {}
  }
  return [];
};
/**
 * @description 获取答案
 */
export const getAnswerOthers = async (question: string) => {
  // 搜索答案
  const res1 = await axios.get(API_CONFIG.answerSearch[1], {
    params: {
      modelid: 1,
      q: question,
    },
  });
  // 请求成功
  if (res1.status === 200) {
    try {
      const { data }: { data: string } = res1;
      // 答案
      const answerList =
        data.match(/(?<=答案：.*[A-Z][.、：])[^<]+/g) ||
        data.match(/(?<=答案：.*)[^<A-Z]+/g);
      if (answerList && answerList.length) {
        // 答案文本
        const answerText = answerList[0];
        // 答案
        const answers = answerText
          .split(/[,，][A-Z][.、：]/)
          .map((ans) => ans.trim());
        return answers;
      }
    } catch (error) {}
  }
  // 保存答案
  const res2 = await axios.get(API_CONFIG.answerSearch[2], {
    params: {
      age: question,
    },
  });
  // 请求成功
  if (res2.status === 200) {
    try {
      const { data }: { data: string } = res2;
      // 答案
      const answerList =
        data.match(/(?<=答案：.*[A-Z][.、：])[^<]+/g) ||
        data.match(/(?<=答案：.*)[^<A-Z]+/g);
      if (answerList && answerList.length) {
        const answers = answerList[0].split(' ');
        return answers;
      }
    } catch (error) {}
  }
  return [];
};
