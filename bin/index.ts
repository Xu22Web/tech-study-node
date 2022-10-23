import chalk from 'chalk';
import schedule from 'node-schedule';
import pup from 'puppeteer-core';
import handleBrowser from '../src/app';
import API_CONFIG from '../src/config/api';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import { Schedule, SCHEDULE_CONFIG } from '../src/config/schedule';
import STUDY_CONFIG from '../src/config/study';
import URL_CONFIG from '../src/config/url';
import shared from '../src/shared';
import {
  formatScheduleList,
  getHighlightHTML,
  getRestScheduleList,
  getTableHTML,
} from '../src/utils';
/**
 * @description 配置
 */
type Config = {
  apiConfig: Partial<typeof API_CONFIG>;
  pupConfig: Partial<typeof PUP_CONFIG>;
  pushConfig: Partial<typeof PUSH_CONFIG>;
  studyConfig: Partial<typeof STUDY_CONFIG>;
  urlConfig: Partial<typeof URL_CONFIG>;
};
/**
 * @description 定义配置
 */
export const defineConfig = (config: Config) => {
  const { apiConfig, pupConfig, pushConfig, studyConfig, urlConfig } = config;
  // 合并配置
  Object.assign(API_CONFIG, apiConfig);
  Object.assign(PUP_CONFIG, pupConfig);
  Object.assign(PUSH_CONFIG, pushConfig);
  Object.assign(STUDY_CONFIG, studyConfig);
  Object.assign(URL_CONFIG, urlConfig);
};

/**
 * @description 处理任务
 * @param token
 * @param nick
 */
export const handleSchedule = async (schedule: Schedule) => {
  // 初始化消息当前用户token
  shared.setSchedule(schedule);
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  shared.log.success('已打开浏览器!');
  try {
    // 处理浏览器
    await handleBrowser(browser);
    // 关闭浏览器
    await shared.closeBrowser();
    shared.log.info('已关闭浏览器!');
  } catch (e: any) {
    // 关闭浏览器
    await shared.closeBrowser();
    shared.log.warn('发生错误，已关闭浏览器!');
    // 错误
    const err = new Error(e);
    shared.log.fail([
      `${chalk.red(err.message)}`,
      `${chalk.red(err.stack || 'unkown stack')}`,
    ]);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: ['发生错误!', err.message, err.stack || 'unkown stack'],
      type: 'fail',
    });
  }
  // 剩余任务
  const rest = getRestScheduleList(SCHEDULE_CONFIG);
  // 存在下次任务
  if (rest.length) {
    shared.log.warn('服务提示');
    shared.log.info(
      `用户: ${chalk.yellow(schedule.nick)}, 定时任务已执行完毕!`
    );
    shared.log.info(`今天剩余任务数: ${chalk.yellow(rest.length)} 个`);
    shared.log.warn(`下次任务信息`);
    shared.log.info(`用户: ${chalk.yellow(rest[0].nick)}`);
    shared.log.info(`时间: ${chalk.yellow(rest[0].timeText)}`);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(schedule.nick)}, 定时任务完成!`,
        `今天剩余任务数: ${getHighlightHTML(rest.length)} 个`,
        '剩余任务信息: ',
        getTableHTML(
          ['用户', '时间'],
          rest.map((item) => [`${item.nick}`, `${item.timeText}`])
        ),
      ],
      type: 'info',
    });
  } else {
    shared.log.warn('服务提示');
    shared.log.info(
      `用户: ${chalk.yellow(schedule.nick)}, 定时任务已执行完毕!`
    );
    shared.log.success(`今天定时任务均已完成!`);
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(schedule.nick)}, 定时任务完成!`,
        `今天定时任务均已完成!`,
      ],
      type: 'info',
    });
  }
};

/**
 * @description 开始定时任务
 */
export const startSchedule = () => {
  // 剩余任务
  const restSchedule = getRestScheduleList(SCHEDULE_CONFIG);
  // 存在剩余任务
  if (restSchedule.length) {
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        '已运行定时任务!',
        `今天剩余任务数: ${getHighlightHTML(restSchedule.length)} 个`,
        '剩余任务信息: ',
        getTableHTML(
          ['用户', '时间'],
          restSchedule.map((item) => [`${item.nick}`, `${item.timeText}`])
        ),
      ],
      type: 'info',
    });
  } else {
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: ['已运行定时任务!', '今天定时任务均已完成!'],
      type: 'info',
    });
  }
  // 执行清除日志任务
  schedule.scheduleJob('0 0 0 * * ?', () => {
    // 清除日志
    shared.log.autoClean();
  });
  // 任务列表
  const scheduleList = formatScheduleList(SCHEDULE_CONFIG);
  console.log('开始设置定时任务!');
  // 定时任务
  scheduleList.forEach((currentSchedule, i) => {
    console.log(
      `${i + 1} / ${SCHEDULE_CONFIG.length} | 时间: ${currentSchedule.timeText}`
    );
    schedule.scheduleJob(currentSchedule.cron, async () => {
      // 开始日志
      shared.log.start();
      shared.log.info(
        `正在执行 ${chalk.blueBright(currentSchedule.nick)} 的定时任务...`
      );
      // 处理任务
      await handleSchedule(currentSchedule);
      // 结束日志
      shared.log.finish();
    });
  });
};
// 开始任务
startSchedule();
