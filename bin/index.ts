import chalk from 'chalk';
import schedule from 'node-schedule';
import * as pup from 'puppeteer-core';
import { handleRefresh, handleStudy } from '../src/app';
import PUP_CONFIG from '../src/config/pup';
import { SCHEDULE_CONFIG } from '../src/config/schedule';
import shared from '../src/shared';
import { formatDate, formatDateTime, formatTime } from '../src/utils/fomat';
import { getHighlightHTML, getTableHTML } from '../src/utils/html';
import { Job, RefreshJob, StudyJob, createJobs } from '../src/utils/job';
import { sleep } from '../src/utils/utils';

/**
 * @description 处理学习任务
 * @param schedule
 * @param restJobs
 */
export const handleStudyJob = async (job: StudyJob, jobs: Job[]) => {
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  // 等待浏览器准备完成
  await sleep(2000);
  // 设置浏览器
  shared.setBrowser(browser);
  // 打开页面
  await shared.openPage();
  shared.log.success('已打开浏览器!');

  // 任务信息
  const { params, time } = job;
  // 参数信息
  const { token, nick } = params;
  // 任务参数
  shared.setParams(params);
  // 推送配置
  shared.setPushOptions({ token, nick });

  try {
    // 处理学习任务
    await handleStudy();
    shared.log.info('关闭浏览器!');
    // 关闭浏览器
    await shared.closeBrowser();
  } catch (e: any) {
    shared.log.warn('发生错误, 关闭浏览器!');
    // 关闭浏览器
    await shared.closeBrowser();
    // 错误
    const err = new Error(e);
    shared.log.fail([`${chalk.red(err.stack || 'unknown stack')}`]);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: ['发生错误!', err.stack || 'unknown stack'],
      type: 'fail',
    });
    // 推送学习提示
    shared.pushModal({
      title: '学习提示',
      content: [
        '发生学习错误!',
        `任务信息: ${getHighlightHTML(formatDateTime(time))}`,
      ],
      type: 'fail',
    });
  }
  // 获取今天剩余任务
  const rest = <StudyJob[]>jobs.filter((item) => {
    return item.type === 'study' && formatDate(item.time) === formatDate();
  });

  // 存在下次任务
  if (rest.length) {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(nick)}, 定时任务已执行完毕!`);
    shared.log.info(`今天剩余任务数: ${chalk.yellow(rest.length)} 个`);
    shared.log.warn(`下次任务信息`);
    shared.log.info(`用户: ${chalk.yellow(rest[0].params.nick)}`);
    shared.log.info(`时间: ${chalk.yellow(formatTime(rest[0].time))}`);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(nick)}, 定时任务完成!`,
        `今天剩余任务数: ${getHighlightHTML(rest.length)} 个`,
        '剩余任务信息: ',
        getTableHTML(
          ['用户', '时间'],
          rest.map((item) => [
            `${item.params.nick}`,
            `${formatTime(rest[0].time)}`,
          ])
        ),
      ],
      type: 'info',
    });
  } else {
    shared.log.warn('服务提示');
    shared.log.info(`用户: ${chalk.yellow(nick)}, 定时任务已执行完毕!`);
    shared.log.success(`今天定时任务均已完成!`);
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: ${getHighlightHTML(nick)}, 定时任务完成!`,
        `今天定时任务均已完成!`,
      ],
      type: 'info',
    });
  }
};

/**
 * @description 处理刷新任务
 * @param job
 * @param jobs
 * @returns
 */
const handleRefreshJob = async (job: RefreshJob, jobs: Job[]) => {
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  // 等待浏览器准备完成
  await sleep(2000);
  // 设置浏览器
  shared.setBrowser(browser);
  // 打开页面
  await shared.openPage();
  shared.log.success('已打开浏览器!');

  // 任务信息
  const { params, time } = job;
  // 参数信息
  const { token, cookieId: nick } = params;
  // 任务参数
  shared.setParams(params);
  // 推送配置
  shared.setPushOptions({ token, nick });

  try {
    // 处理刷新任务
    const success = await handleRefresh();
    if (success) {
      shared.log.success(
        `时间: ${chalk.yellow(
          formatDateTime(time)
        )} | CookieId: ${chalk.blueBright(nick)} 刷新任务成功!`
      );
    } else {
      shared.log.fail(
        `时间: ${chalk.yellow(
          formatDateTime(time)
        )} | CookieId: ${chalk.blueBright(nick)} 刷新任务失败!`
      );
      // 后续任务标识无效
      jobs.forEach((job) => {
        if (
          job.type === 'freshCookie' &&
          job.params.cookieId === params.cookieId
        ) {
          job.effective = false;
        }
      });
    }
    shared.log.info('关闭浏览器!');
    // 关闭浏览器
    await shared.closeBrowser();
  } catch (e: any) {
    shared.log.warn('发生错误, 关闭浏览器!');
    // 关闭浏览器
    await shared.closeBrowser();
    // 错误
    const err = new Error(e);
    shared.log.fail([`${chalk.red(err.stack || 'unknown stack')}`]);
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: ['发生刷新错误!', err.stack || 'unknown stack'],
      type: 'fail',
    });
    // 推送刷新提示
    shared.pushModal({
      title: '刷新提示',
      content: [
        '发生刷新错误!',
        `任务信息: ${getHighlightHTML(formatDateTime(time))}`,
      ],
      type: 'fail',
    });
    // 后续任务标识无效
    jobs.forEach((job) => {
      if (
        job.type === 'freshCookie' &&
        job.params.cookieId === params.cookieId
      ) {
        job.effective = false;
      }
    });
  }
};

/**
 * @description 刷新任务
 * @param job
 * @param restJobs
 */
const runRefreshJob = async (job: RefreshJob, jobs: Job[]) => {
  console.log(
    `时间: ${chalk.yellow(
      formatDateTime(job.time)
    )} | CookieId: ${chalk.blueBright(job.params.cookieId)} 刷新任务开始!`
  );

  shared.log.start();
  shared.log.info(
    `正在执行 时间: ${chalk.yellow(
      formatDateTime(job.time)
    )} | CookieId: ${chalk.blueBright(job.params.cookieId)} 刷新任务...`
  );

  // 处理任务
  await handleRefreshJob(job, jobs);

  shared.log.info(
    `执行完成 时间: ${chalk.yellow(
      formatDateTime(job.time)
    )} | CookieId: ${chalk.blueBright(job.params.cookieId)} 刷新任务!`
  );
  shared.log.finish();
};

/**
 * @description 学习任务
 * @param job
 * @param restJobs
 */
const runStudyJob = async (job: StudyJob, jobs: Job[]) => {
  const { params, time } = job;
  console.log(
    `时间: ${chalk.yellow(formatTime(time))} | 用户: ${chalk.blueBright(
      params.nick
    )} 学习任务开始!`
  );

  // 开始日志
  shared.log.start();
  shared.log.info(
    `正在执行 时间: ${chalk.yellow(
      formatTime(time)
    )} | 用户: ${chalk.blueBright(params.nick)} 学习任务...`
  );

  // 处理任务
  await handleStudyJob(job, jobs);

  shared.log.info(
    `执行完成 时间: ${chalk.yellow(
      formatTime(time)
    )} | 用户: ${chalk.blueBright(params.nick)} 学习任务!`
  );
  // 结束日志
  shared.log.finish();

  // 任务
  const schedule = SCHEDULE_CONFIG.find(
    (schedule) => schedule.nick === job.params.nick
  )!;
  // 学习任务结束后，往任务列表加入新一轮的任务
  const { jobs: newJobs } = createJobs([schedule]);
  jobs.push(...newJobs);
  // 重新排序
  jobs.sort((a, b) => a.time - b.time);
};

/**
 * @description 运行任务
 * @returns
 */
const runJobs = (jobs: Job[]) => {
  // 过滤无效任务
  const effectiveJobs = jobs.filter(
    (job) => job.type === 'study' || job.effective
  );
  // 当前任务
  const currentJob = effectiveJobs.shift();
  // 所有任务已完成
  if (!currentJob) {
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
  // 任务信息
  const { time, type } = currentJob;
  // 任务运行时间
  const jobRunTime =
    time <= currentTime && type === 'study' ? currentTime + 1000 * 3 : time;

  console.log(
    `\n当前任务信息: ${chalk.blueBright(
      type === 'study' ? '学习任务' : '刷新任务'
    )} | 时间: ${chalk.yellow(formatDateTime(jobRunTime))}\n`
  );

  // 分配任务
  schedule.scheduleJob(new Date(jobRunTime), async () => {
    // 学习任务
    if (type === 'study') {
      try {
        await runStudyJob(currentJob, effectiveJobs);
      } catch (e) {
        console.log('runStudyJob error', e);
      }
      // 运行下个任务
      runJobs(effectiveJobs);
      return;
    }
    // 刷新任务
    if (type === 'freshCookie') {
      try {
        await runRefreshJob(currentJob, effectiveJobs);
      } catch (e) {
        console.log('runRefreshJob error', e);
      }
      // 运行下个任务
      runJobs(effectiveJobs);
      return;
    }
  });
};

/**
 * @description 开始定时任务
 */
const startScheduleJobs = () => {
  // 创建任务
  const { jobs, studyJobs, refreshJobs } = createJobs(SCHEDULE_CONFIG);

  console.log(
    `统计任务信息: ${chalk.yellow(studyJobs.length)} 个学习任务, ${chalk.yellow(
      refreshJobs.length
    )} 个刷新任务`
  );

  // 任务表格
  const table = jobs.map((job) => {
    if (job.type === 'study') {
      return {
        type: '学习任务',
        time: formatDateTime(job.time),
        nick: job.params.nick,
      };
    }
    if (job.type === 'freshCookie') {
      return {
        type: '刷新任务',
        time: formatDateTime(job.time),
        nick: job.params.cookieId,
      };
    }
  });
  console.table(table);

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
          studyJobs.map((studyJob) => [
            `${studyJob.params.nick}`,
            `${formatTime(studyJob.time)}`,
          ])
        ),
      ],
      type: 'info',
    });
  }
  // 运行任务
  runJobs(jobs);
};

(() => {
  if (SCHEDULE_CONFIG.length === 0) {
    console.warn('当前没有配置的任务信息，中断执行。');
    return;
  }
  // 开始定时任务
  startScheduleJobs();
  // 执行清除日志任务
  schedule.scheduleJob('0 0 0 * * ?', () => {
    // 清除日志
    shared.log.autoClean();
  });
})();
