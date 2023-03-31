import chalk from 'chalk';
import schedule from 'node-schedule';
import * as pup from 'puppeteer-core';
import handleBrowser from '../src/app';
import API_CONFIG from '../src/config/api';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import { Schedule, SCHEDULE_CONFIG } from '../src/config/schedule';
import STUDY_CONFIG from '../src/config/study';
import URL_CONFIG from '../src/config/url';
import shared from '../src/shared';
import {
  generateStudyJobParams,
  generateRefreshCookieJobs,
  getHighlightHTML,
  getTableHTML,
  formatDate,
  formatDateTime,
} from '../src/utils';

import type { Job, StudyJob, RefreshCookieJob } from '../src/utils/interface';

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
export const handleSchedule = async (schedule: Schedule, restJobs: Job[]) => {
  // 初始化消息当前用户token
  shared.setSchedule(schedule);
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  shared.log.success('已打开浏览器!');
  try {
    // 处理浏览器
    await handleBrowser(browser);
    shared.log.info('关闭浏览器!');
  } catch (e: any) {
    shared.log.warn('发生错误，关闭浏览器!');
    // 错误
    const err = new Error(e);
    shared.log.fail([`${chalk.red(err.stack || 'unkown stack')}`]);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: ['发生错误!', err.stack || 'unkown stack'],
      type: 'fail',
    });
  }
  // 关闭浏览器
  await shared.closeBrowser();

  const currentTime = new Date();
  // 获取今天剩余任务
  const rest = restJobs.filter((item) => {
    return item.type === 'study' && formatDate(item.time) === formatDate(currentTime);
  }) as StudyJob[];

  // 存在下次任务
  if (rest.length) {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(schedule.nick)}, 定时任务已执行完毕!`);
    shared.log.info(`今天剩余任务数: ${chalk.yellow(rest.length)} 个`);
    shared.log.warn(`下次任务信息`);
    shared.log.info(`用户: ${chalk.yellow(rest[0].params.nick)}`);
    shared.log.info(`时间: ${chalk.yellow(rest[0].params.timeText)}`);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(schedule.nick)}, 定时任务完成!`,
        `今天剩余任务数: ${getHighlightHTML(rest.length)} 个`,
        '剩余任务信息: ',
        getTableHTML(
          ['用户', '时间'],
          rest.map((item) => [`${item.params.nick}`, `${item.params.timeText}`])
        ),
      ],
      type: 'info',
    });
  } else {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(schedule.nick)}, 定时任务已执行完毕!`);
    shared.log.success(`今天定时任务均已完成!`);
    shared.pushModalTips({
      title: '服务提示',
      content: [`用户: ${getHighlightHTML(schedule.nick)}, 定时任务完成!`, `今天定时任务均已完成!`],
      type: 'info',
    });
  }
};

/**
 * 初始任务列表，包含刷新任务与学习任务
 * @returns
 */
const createJobs = (scheduleList: Schedule[] = SCHEDULE_CONFIG) => {
  const refreshJobs: RefreshCookieJob[] = [];
  const studyJobs: StudyJob[] = [];

  const studyJobParams = generateStudyJobParams(scheduleList);
  studyJobParams.forEach((params) => {
    const refreshCookieJobs = generateRefreshCookieJobs({
      endTime: params.nextDate,
      intervalRange: params.refreshCookieInterval,
      cookieId: params.nick,
    });
    refreshJobs.push(...refreshCookieJobs);
    studyJobs.push({
      type: 'study',
      time: params.nextDate.getTime(),
      params: params,
    });
  });

  const jobs: Job[] = [...refreshJobs, ...studyJobs];

  jobs.sort((a, b) => a.time - b.time);

  return { jobs, studyJobs, refreshJobs };
};

/**
 * 刷新任务
 * @param jobConfig
 * @param restJobs
 */
const runRefreshJob = async (jobConfig: RefreshCookieJob, restJobs: Job[]) => {
  console.log(
    chalk.blueBright(
      `时间: ${new Date(jobConfig.time).toLocaleString()} | CookieId: ${
        jobConfig.params.cookieId
      } 刷新任务开始!`
    )
  );

  shared.log.start();
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  // 设置浏览器
  shared.setBrowser(browser);
  // 打开页面
  await shared.openPage();
  shared.log.success('已打开浏览器!');

  const success = await shared.refreshCookie(jobConfig.params.cookieId);

  if (success) {
    console.log(
      chalk.greenBright(
        `时间: ${new Date(jobConfig.time).toLocaleString()} | CookieId: ${
          jobConfig.params.cookieId
        } 刷新任务成功!`
      )
    );
  } else {
    console.log(
      chalk.redBright(
        `时间: ${new Date(jobConfig.time).toLocaleString()} | CookieId: ${
          jobConfig.params.cookieId
        } 刷新任务失败!`
      )
    );

    // 刷新任务失效后，后续的刷新任务标识为无效
    restJobs.forEach((job) => {
      if (job.type === 'freshCookie' && job.params.cookieId === jobConfig.params.cookieId) {
        job.effective = false;
      }
    });
  }

  // 关闭浏览器
  await shared.closeBrowser();
  shared.log.finish();
};

/**
 * 学习任务
 * @param jobConfig
 * @param restJobs
 */
const runStudyJob = async (jobConfig: StudyJob, restJobs: Job[]) => {
  const { params } = jobConfig;
  console.log(
    `时间: ${chalk.yellow(params.timeText)} | 用户: ${chalk.blueBright(params.nick)} 定时任务开始!`
  );

  // 开始日志
  shared.log.start();
  shared.log.info(
    `正在执行 时间: ${chalk.yellow(params.timeText)} | 用户: ${chalk.blueBright(
      params.nick
    )} 的定时任务...`
  );

  // 处理任务
  await handleSchedule(params, restJobs);

  shared.log.info(
    `执行完成 时间: ${chalk.yellow(params.timeText)} | 用户: ${chalk.blueBright(
      params.nick
    )} 的定时任务!`
  );
  // 结束日志
  shared.log.finish();

  // 学习任务结束后，往任务列表加入新一轮的任务
  const { jobs: newJobs } = createJobs([jobConfig.params]);

  restJobs.push(...newJobs);
  // 重新排序
  restJobs.sort((a, b) => a.time - b.time);
};

const startScheduleJobs = () => {
  const { jobs, studyJobs, refreshJobs } = createJobs();

  let effectiveJobs = jobs;

  console.log(
    `开始设置定时任务: ${chalk.bgYellowBright(studyJobs.length)} 个学习任务，${chalk.bgYellowBright(
      refreshJobs.length
    )} 个刷新任务`
  );

  effectiveJobs.forEach((job, index) => {
    if (job.type === 'study') {
      console.log(
        chalk.bgYellow(
          `${index + 1} 预定任务时间: [${formatDateTime(job.time)}] | ${job.params.nick} - 学习任务`
        )
      );
    } else {
      console.log(
        chalk.bgBlue(
          `${index + 1} 预定任务时间: [${formatDateTime(job.time)}] | ${
            job.params.cookieId
          } - 刷新任务`
        )
      );
    }
  });

  if (studyJobs.length) {
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        '已开启定时任务!',
        `今天剩余任务数: ${getHighlightHTML(studyJobs.length)} 个`,
        '剩余任务信息: ',
        getTableHTML(
          ['用户', '时间'],
          studyJobs.map((item) => [`${item.params.nick}`, `${item.params.timeText}`])
        ),
      ],
      type: 'info',
    });
  }

  const runJob = () => {
    // 过滤掉无效的任务
    effectiveJobs = effectiveJobs.filter((it) => it.type === 'study' || it.effective);

    const jobConfig = effectiveJobs.shift();
    // 所有任务已完成
    if (!jobConfig) {
      // 推送服务提示
      shared.pushModalTips({
        title: '服务提示',
        content: ['已运行定时任务!', '今天定时任务均已完成!'],
        type: 'info',
      });

      // 重启新一轮任务
      startScheduleJobs();
      return;
    }

    // 运行下一个任务，如果任务已经过期，则以当前时间往后 3 秒运行
    const currentTime = Date.now();
    const jobRunTime =
      jobConfig.time <= currentTime ? new Date(currentTime + 1000 * 3) : new Date(jobConfig.time);

    console.log(
      chalk.bgBlueBright(
        `设置定时任务: [${formatDateTime(jobRunTime)}] | 任务类型：[${jobConfig.type}]`
      )
    );

    schedule.scheduleJob(jobRunTime, async () => {
      if (jobConfig.type === 'study') {
        await runStudyJob(jobConfig, effectiveJobs).catch((err) => {
          console.log('runStudyJob error', err);
        });
      } else {
        await runRefreshJob(jobConfig, effectiveJobs).catch((err) => {
          console.log('runRefreshJob', err);
        });
      }
      runJob();
    });
  };

  runJob();
};

(async function () {
  startScheduleJobs();
  // 执行清除日志任务
  schedule.scheduleJob('0 0 0 * * ?', () => {
    // 清除日志
    shared.log.autoClean();
  });
})();
