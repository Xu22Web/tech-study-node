import chalk from 'chalk';
import ora from 'ora';
import pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import { getNews, getTaskList, NewsOrVideoList } from '../apis';
import { gotoPage } from '../utils';
/**
 * @description 处理读文章
 */
const handleReadNews = async (page: pup.Page): Promise<boolean> => {
  // 获取新闻
  const news = await getTodayNews(page);
  // 进度
  const progress = ora();
  //遍历文章
  for (const i in news) {
    progress.info(
      `${chalk.blueBright(Number(i) + 1)} / ${
        news.length
      } | 标题: ${chalk.blueBright(news[i].title.substring(0, 15))}`
    );
    // 跳转页面
    await gotoPage(page, news[i].url, { waitUntil: 'domcontentloaded' });
    // 看新闻
    await readingNews(page, progress);
    // 任务进度
    const taskList = await getTaskList(page);
    // 提前完成
    if (taskList.length && taskList[0].status) {
      break;
    }
  }
  // 任务进度
  const taskList = await getTaskList(page);
  // 未完成
  if (taskList.length && !taskList[0].status) {
    // 继续观看
    return await handleReadNews(page);
  }
  // 无任务
  if (!taskList.length) {
    return false;
  }
  return true;
};
/**
 * @description 获取当天新闻
 * @returns
 */
const getTodayNews = async (page: pup.Page) => {
  // 任务进度
  const taskList = await getTaskList(page);
  // 最大新闻数
  const { maxNewsNum } = STUDY_CONFIG;
  // 新闻数
  const newsNum = taskList[0].need;
  // 需要学习的新闻数量
  const need = newsNum < maxNewsNum ? newsNum : maxNewsNum;
  // 获取重要新闻
  const newsList = await getNews();
  // 新闻
  const news: NewsOrVideoList = [];
  // 存在新闻列表
  if (newsList && newsList.length) {
    // 数量补足需要数量
    while (news.length < need) {
      // 随便取
      const randomIndex = ~~(Math.random() * (newsList.length + 1));
      news.push(newsList[randomIndex]);
    }
    return news;
  }
  return news;
};
/**
 * @description 读新闻
 * @param page
 * @returns
 */
const readingNews = async (page: pup.Page, progress: ora.Ora) => {
  // 看文章时间
  let duration = ~~(Math.random() * (100 - 80 + 1) + 80);
  // 滚动延迟
  const startScoll = duration - 5;
  const endScoll = 5;
  return new Promise<boolean>((resolve) => {
    // 定时器
    const timer = setInterval(async () => {
      progress.start(`观看剩余时间: ${chalk.blueBright(duration)} s`);
      if (!duration) {
        progress.succeed('已观看完当前新闻!');
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

export default handleReadNews;
