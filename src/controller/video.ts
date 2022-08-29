import chalk from 'chalk';
import ora from 'ora';
import pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import { getTaskList, getVideos, NewsOrVideoList } from '../apis';
import { gotoPage } from '../utils';
/**
 * @description 处理看视频
 */
const handleWatchVideo = async (page: pup.Page): Promise<boolean> => {
  // 获取视频
  const videos = await getTodayVideos(page);
  // 进度
  const progress = ora();
  // 遍历视频
  for (const i in videos) {
    progress.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        videos.length
      } | 标题: ${chalk.blueBright(videos[i].title.substring(0, 15))}`
    );
    // 页面跳转
    const response = await gotoPage(page, videos[i].url, {
      waitUntil: 'domcontentloaded',
    });
    // 跳转失败
    if (!response) {
      progress.info('观看页面跳转失败!');
      continue;
    }
    // 观看视频
    const res = await watchVideos(page, progress);
    // 观看失败
    if (!res) {
      progress.info('观看失败, 跳过此视频!');
      continue;
    }
    // 任务进度
    const taskList = await getTaskList(page);
    // 提前完成
    if (taskList.length && taskList[1].status) {
      break;
    }
  }
  // 任务进度
  const taskList = await getTaskList(page);
  // 未完成
  if (taskList.length && !taskList[1].status) {
    // 继续观看
    return await handleWatchVideo(page);
  }
  // 无任务
  if (!taskList.length) {
    return false;
  }
  return true;
};
/**
 * @description 获取当天视频
 * @returns
 */
const getTodayVideos = async (page: pup.Page) => {
  // 任务进度
  const taskList = await getTaskList(page);
  // 最大视频数
  const { maxVideoNum } = STUDY_CONFIG;
  // 视频数
  const videoNum = taskList[1].need;
  // 需要学习的视频数量
  const need = videoNum < maxVideoNum ? videoNum : maxVideoNum;
  // 获取重要视频
  const videoList = await getVideos();
  // 视频
  const videos: NewsOrVideoList = [];
  // 存在视频列表
  if (videoList && videoList.length) {
    // 数量补足需要数量
    while (videos.length < need) {
      // 随便取
      const randomIndex = ~~(Math.random() * (videoList.length + 1));
      videos.push(videoList[randomIndex]);
    }
    return videos;
  }
  return videos;
};
/**
 * @description 看视频
 * @param page
 * @returns
 */
const watchVideos = async (page: pup.Page, progress: ora.Ora) => {
  // 视频可以播放
  const canPlay = await page.evaluate((time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // iframe
        const iframe = document.querySelector<HTMLIFrameElement>('iframe');
        // 视频
        let video: HTMLVideoElement | null;
        // 获取播放器
        if (iframe && iframe.contentWindow) {
          // 如果有iframe,说明外面的video标签是假的
          video =
            iframe.contentWindow.document.querySelector<HTMLVideoElement>(
              'video'
            );
        } else {
          video = document.querySelector<HTMLVideoElement>('video');
        }
        // 视频可播放
        if (video) {
          // 清除计时器
          clearInterval(timer);
          // 是否可播放
          video.addEventListener('canplay', () => {
            clearInterval(timeout);
            resolve(true);
          });
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!canPlay) {
    progress.fail('当前视频无法播放!');
    return false;
  }

  // 播放视频
  const playing = await page.evaluate(async (time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(async () => {
        const iframe = document.querySelector<HTMLIFrameElement>('iframe');
        // 视频
        let video: HTMLVideoElement | null;
        // 播放按钮
        let pauseButton: HTMLButtonElement | null;
        if (iframe) {
          // 如果有iframe,说明外面的video标签是假的
          video = <HTMLVideoElement>(
            iframe.contentWindow?.document.querySelector('video')
          );
          pauseButton = <HTMLButtonElement>(
            iframe.contentWindow?.document.querySelector('.prism-play-btn')
          );
        } else {
          // 否则这个video标签是真的
          video = document.querySelector<HTMLVideoElement>('video');
          pauseButton =
            document.querySelector<HTMLButtonElement>('.prism-play-btn');
        }
        // 获取视频、播放按钮
        if (video && pauseButton) {
          // 静音
          video.muted = true;
          // 播放
          if (video.paused) {
            // js播放
            await video.play();
          }
          if (video.paused) {
            // 点击播放
            pauseButton.click();
          }
          // 播放
          if (!video.paused) {
            // 清除计时器
            clearInterval(timer);
            clearInterval(timeout);
            resolve(true);
          }
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
  // 无法播放
  if (!playing) {
    progress.fail('当前视频无法播放!');
    return false;
  }
  // 倒计时
  return await videoCountDown(progress, page);
};
/**
 * @description 倒计时
 * @param progress
 * @returns
 */
const videoCountDown = (progress: ora.Ora, page: pup.Page) => {
  // 看视频时间
  let duration = ~~(Math.random() * (250 - 230 + 1) + 230);
  // 滚动延迟
  const startScoll = duration - 5;
  const endScoll = 5;
  return new Promise<boolean>((resolve) => {
    // 定时器
    const timer = setInterval(async () => {
      progress.start(`观看剩余时间: ${chalk.blueBright(duration)} s`);
      if (!duration) {
        progress.succeed('已观看完当前视频!');
        clearInterval(timer);
        resolve(true);
      }
      // 下拉
      if (duration === startScoll) {
        await page.evaluate(() => {
          const scrollLength = document.body.scrollHeight / 3;
          window.scrollTo(0, scrollLength);
        });
      }
      // 回滚
      if (duration === endScoll) {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      }
      duration--;
    }, 1000);
  });
};

export default handleWatchVideo;
