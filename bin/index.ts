import pup from 'puppeteer-core';
import schedule from 'node-schedule';
import paser from 'cron-parser';
import chalk from 'chalk';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import handleBrowser from '../src/app';
import shared from '../src/shared';
import { formatDateTime } from '../src/utils';

// 主函数
const main = async () => {
  shared.log.loading('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  shared.log.success('已打开浏览器!');
  try {
    // 处理浏览器
    await handleBrowser(browser);
    // 关闭浏览器
    await browser.close();
    shared.log.info('已关闭浏览器!');
  } catch (e: any) {
    // 关闭浏览器
    await browser.close();
    shared.log.warn('遇到错误，已关闭浏览器!');
    throw e;
  }
};
// 推送服务提示
shared.pushModalTips({
  title: '服务提示',
  content: '已运行定时任务!',
  type: 'info',
});

// 执行清除日志任务
schedule.scheduleJob('0 0 0 * * ?', () => {
  // 清除日志
  shared.log.autoClean();
});

// 定时任务
PUSH_CONFIG.list.forEach((sendInfo, i) => {
  console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 执行定时任务`);
  // 执行定时任务
  schedule.scheduleJob(sendInfo.cron, async () => {
    console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 正在执行定时任务...`);
    // 初始化消息当前用户token
    shared.setToken(sendInfo.token);
    // 昵称
    shared.setNick(sendInfo.nick);
    try {
      // 开始日志
      shared.log.start();
      // 执行主函数
      await main();
    } catch (e) {
      shared.log.warn('服务提示');
      shared.log.fail('发生错误!');
      shared.log.fail(`${chalk.red(String(e))}`);
      // 推送服务提示
      shared.pushModalTips({
        title: '服务提示',
        content: ['发生错误!', String(e)],
        type: 'fail',
      });
    }
    // 剩余任务
    const rest = PUSH_CONFIG.list
      .map((sendInfo) => {
        // 任务时间
        const time = paser.parseExpression(sendInfo.cron);
        // 下次任务时间
        const nextTime = time.next().toDate();
        // 当前时间
        const date = new Date();
        // 当前任务是否结束
        const done = !time.hasNext();
        // 下个任务是否在今天
        const isToday = !done && nextTime.getDate() === date.getDate();
        return {
          ...sendInfo,
          isToday,
          done,
          timeText: formatDateTime(nextTime),
          time: nextTime.getTime(),
        };
      })
      .filter((sendInfo) => sendInfo.isToday)
      .sort((a, b) => a.time - b.time);

    // 存在下次任务
    if (rest.length) {
      shared.log.warn('服务提示');
      shared.log.info(
        `用户: ${chalk.yellow(sendInfo.nick)}, 定时任务已执行完毕!`
      );
      shared.log.info(`今天剩余任务数: ${chalk.yellow(rest.length)} 个`);
      shared.log.info(`下次任务信息`);
      shared.log.info(`用户: ${chalk.yellow(rest[0].nick)}`);
      shared.log.info(`时间: ${chalk.yellow(rest[0].timeText)}`);
      // 推送服务提示
      shared.pushModalTips({
        title: '服务提示',
        content: [
          `用户: <span style="color: #1890ff">${sendInfo.nick}</span>, 定时任务完成!`,
          `今天剩余任务数: <span style="color: #1890ff">${rest.length}</span> 个`,
          '下次任务信息: ',
          `用户: <span style="color: #1890ff">${rest[0].nick}</span>`,
          `时间: <span style="color: #1890ff">${rest[0].timeText}</span>`,
        ],
        type: 'info',
      });
    } else {
      shared.log.warn('服务提示');
      shared.log.info(
        `用户: ${chalk.yellow(sendInfo.nick)}, 定时任务已执行完毕!`
      );
      shared.log.success(`今天定时任务均已完成!`);
      shared.pushModalTips({
        title: '服务提示',
        content: [
          `用户: <span style="color: #1890ff">${sendInfo.nick}</span>, 定时任务完成!`,
          `今天定时任务均已完成!`,
        ],
        type: 'info',
      });
    }
    // 结束日志
    shared.log.finish();
    // 清除缓存
    shared.log.clear();
  });
});

// main();
