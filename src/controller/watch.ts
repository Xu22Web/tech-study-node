import chalk from 'chalk';
import { newsList, videoList } from '../apis';
import STUDY_CONFIG from '../config/study';
import shared from '../shared';
import { TaskType } from './user';

/**
 * @description 读文章 | 看视频
 * @returns
 */
const handleWatch = async (type: number) => {
  // 读新闻
  if (type === 0) {
    await handleReadNews();
  }
  // 看视频
  if (type === 1) {
    await handleWatchVideo();
  }
};

/**
 * @description 处理读文章
 */
const handleReadNews = async () => {
  // 获取新闻
  const news = await getTodayNews();
  //遍历文章
  for (const i in news) {
    // 跳转页面
    const gotoRes = await shared.gotoPage(news[i].url, {
      waitUntil: 'domcontentloaded',
    });
    // 页面
    const page = shared.getPage();
    // 跳转失败
    if (!gotoRes || !page) {
      shared.log.fail(
        `${chalk.blueBright(Number(i) + 1)} / ${
          news.length
        } | 标题: ${chalk.blueBright(news[i].title)} 页面跳转失败!`
      );
      continue;
    }
    shared.log.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        news.length
      } | 标题: ${chalk.blueBright(news[i].title)}`
    );
    // 最大段落字数
    const maxTextCount = await page.$$eval('section', (sections) => {
      // 最大字数
      return Math.max(...sections.map((s) => s.innerText.length), 200);
    });
    // 总时长
    const duration = (60 * maxTextCount) / 1000;
    // 预计时间
    // min(duration,  maxWatch.value) 秒后关闭页面
    const predictTime = ~~Math.min(duration, Math.random() * 40 + 40);
    // 倒计时
    await countDown(predictTime, (duration) => {
      // 倒计时存在
      if (duration) {
        shared.log.loading(`观看剩余时间: ${chalk.blueBright(duration)} s`);
        return;
      }
      shared.log.success('已观看完当前新闻!');
    });
    // 任务进度
    await shared.getTaskList();
    // 提前完成
    if (shared.taskList && shared.taskList[TaskType.READ].status) {
      break;
    }
  }
  // 任务进度
  await shared.getTaskList();
  // 未完成
  if (shared.taskList && !shared.taskList[TaskType.READ].status) {
    shared.log.info('未完成任务, 继续看新闻!');
    // 继续观看
    await handleReadNews();
  }
};

/**
 * @description 处理看视频
 */
const handleWatchVideo = async () => {
  // 获取视频
  const videos = await getTodayVideos();
  // 遍历视频
  for (const i in videos) {
    // 页面跳转
    const gotoRes = await shared.gotoPage(videos[i].url, {
      waitUntil: 'domcontentloaded',
    });
    // 页面
    const page = shared.getPage();
    // 跳转失败
    if (!gotoRes || !page) {
      shared.log.fail(
        `${chalk.blueBright(Number(i) + 1)} / ${
          videos.length
        } | 标题: ${chalk.blueBright(videos[i].title)} 页面跳转失败!`
      );
      // 跳过
      continue;
    }
    shared.log.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        videos.length
      } | 标题: ${chalk.blueBright(videos[i].title)}`
    );
    // 播放视频
    const waitRes = await waitVideos();
    // 播放失败， 不影响刷分
    if (!waitRes) {
      shared.log.fail('观看失败, 继续观看!');
    }
    // 总时长
    const duration = await page.$eval('video', (video) => {
      return video.duration;
    });
    // 预计时间
    // min(duration,  maxWatch.value) 秒后关闭页面
    const predictTime = ~~Math.min(duration, Math.random() * 40 + 80);
    // 倒计时
    await countDown(predictTime, (current) => {
      // 倒计时存在
      if (current) {
        shared.log.loading(`观看剩余时间: ${chalk.blueBright(current)} s`);
        return;
      }
      shared.log.success('已观看完当前视频!');
    });
    // 任务进度
    await shared.getTaskList();
    // 提前完成
    if (shared.taskList && shared.taskList[TaskType.WATCH].status) {
      break;
    }
  }
  // 任务进度
  await shared.getTaskList();
  // 未完成
  if (shared.taskList && !shared.taskList[TaskType.WATCH].status) {
    shared.log.info('未完成任务, 继续看视频!');
    // 继续观看
    await handleWatchVideo();
  }
};

/**
 * @description 获取新闻
 * @returns
 */
const getTodayNews = async () => {
  // 任务进度
  await shared.getTaskList();
  // 新闻
  const news: NewsVideoList = [];
  if (shared.taskList) {
    // 最大新闻数
    const { maxNewsNum } = STUDY_CONFIG;
    // 分数
    const { dayMaxScore, currentScore } = shared.taskList[TaskType.READ];
    // 新闻数
    const newsNum = dayMaxScore - currentScore;
    // 需要学习的新闻数量
    const need = newsNum < maxNewsNum ? newsNum : maxNewsNum;
    // 获取重要新闻
    const newsList = await getNews();
    // 存在新闻列表
    if (newsList && newsList.length) {
      // 索引
      let i = 0;
      // 最新新闻
      const latestItems = newsList.slice(0, 100);
      // 当前年份
      const currentYear = new Date().getFullYear().toString();
      // 查找今年新闻
      while (i < need) {
        const randomIndex = ~~(Math.random() * latestItems.length);
        // 新闻
        const item = latestItems[randomIndex];
        // 是否存在
        if (item.publishTime.startsWith(currentYear) && item.type === 'tuwen') {
          news[i] = item;
          i++;
        }
      }
    }
  }
  return news;
};

/**
 * @description 获取视频
 * @returns
 */
const getTodayVideos = async () => {
  // 任务进度
  await shared.getTaskList();
  // 视频
  const videos: NewsVideoList = [];
  if (shared.taskList) {
    // 最大视频数
    const { maxVideoNum } = STUDY_CONFIG;
    // 分数
    const { dayMaxScore, currentScore } = shared.taskList[TaskType.WATCH];
    // 视频数
    const videoNum = dayMaxScore - currentScore;
    // 需要学习的视频数量
    const need = videoNum < maxVideoNum ? videoNum : maxVideoNum;
    // 获取重要视频
    const videoList = await getVideos();
    // 存在视频列表
    if (videoList && videoList.length) {
      // 索引
      let i = 0;
      // 最新视频
      const latestItems = videoList.slice(0, 100);
      // 当前年份
      const currentYear = new Date().getFullYear().toString();
      // 查找今年视频
      while (i < need) {
        const randomIndex = ~~(Math.random() * latestItems.length);
        // 新闻
        const item = latestItems[randomIndex];
        // 是否存在
        if (
          item.publishTime.startsWith(currentYear) &&
          (item.type === 'shipin' || item.type === 'juji')
        ) {
          videos[i] = item;
          i++;
        }
      }
    }
  }
  return videos;
};

/**
 * @description 等待视频
 * @returns
 */
const waitVideos = async () => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return false;
  }
  // 视频可以播放
  const canPlay = await page.evaluate((time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // 获取播放器
        const video = document.querySelector<HTMLVideoElement>('video');
        // 视频可播放
        if (video) {
          // 清除定时器
          clearInterval(timer);
          // 是否可以播放
          video.addEventListener('canplay', () => {
            // 清除超时
            clearTimeout(timeout);
            resolve(true);
          });
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        // 清除定时器
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!canPlay) {
    return false;
  }
  // 播放视频
  const playing = await page.evaluate(async (time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(async () => {
        // 视频
        const video = document.querySelector<HTMLVideoElement>('video');
        // 播放按钮
        const pauseButton =
          document.querySelector<HTMLButtonElement>('.prism-play-btn');
        // 获取视频、播放按钮
        if (video && pauseButton) {
          // 静音
          video.muted = true;
          // 播放
          if (video.paused) {
            // js播放
            await video.play();
          }
          // 播放
          if (video.paused) {
            // 点击播放
            pauseButton.click();
          }
          // 播放
          if (!video.paused) {
            // 清除定时器
            clearInterval(timer);
            // 清除超时延迟
            clearTimeout(timeout);
            resolve(true);
          }
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        // 清除定时器
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!playing) {
    return false;
  }
  return true;
};

/**
 * @description 倒计时
 * @param progress
 * @returns
 */
const countDown = (duration: number, callback: (duration: number) => void) => {
  // 页面
  const page = shared.getPage();
  // 页面不存在
  if (!page) {
    return false;
  }
  // 滚动延迟
  const startScoll = duration - 5;
  const endScoll = 5;
  return new Promise<boolean>((resolve) => {
    // 定时器
    const timer = setInterval(async () => {
      // 倒计时回调
      callback(duration);
      // 倒计时结束
      if (!duration) {
        // 清除定时器
        clearInterval(timer);
        resolve(true);
      }
      // 下拉
      if (duration === startScoll) {
        await page.evaluate(() => {
          const scrollLength = document.body.scrollHeight / 3;
          window.scrollTo(0, scrollLength);
          // 模拟滚动
          const scroll = new Event('scroll', {
            bubbles: true,
          });
          document.dispatchEvent(scroll);
        });
      }
      // 回滚
      if (duration === endScoll) {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          // 模拟滚动
          const scroll = new Event('scroll', {
            bubbles: true,
          });
          document.dispatchEvent(scroll);
        });
      }
      duration--;
    }, 1000);
  });
};

/**
 * @description 新闻列表
 */
export type NewsVideoList = {
  publishTime: string;
  title: string;
  type: string;
  url: string;
  showSource: string;
  auditTime: string;
  dataValid: boolean;
  itemType: string;
}[];

/**
 * @description 获取视频
 * @returns
 */
export const getVideos = async () => {
  // 视频数据
  const data = await videoList();
  if (data) {
    return <NewsVideoList>data;
  }
  return [];
};

/**
 * @description 获取文章
 * @returns
 */
export const getNews = async () => {
  // 新闻数据
  const data = await newsList();
  if (data) {
    return <NewsVideoList>data;
  }
  return [];
};

export default handleWatch;
