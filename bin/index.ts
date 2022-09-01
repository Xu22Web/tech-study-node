import pup from 'puppeteer-core';
import schedule from 'node-schedule';
import paser from 'cron-parser';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import handleBrowser from '../src/app';
import { formatDate } from '../src/utils';
import shared from '../src/shared';

// 主函数
const main = async () => {
  shared.progress.start('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  shared.progress.succeed('已打开浏览器!');
  try {
    // 处理浏览器
    await handleBrowser(browser);
    // 关闭浏览器
    await browser.close();
    shared.progress.info('已关闭浏览器!');
  } catch (e: any) {
    // 关闭浏览器
    await browser.close();
    shared.progress.info('遇到错误，已关闭浏览器!');
    throw new Error(e);
  }
};

// 推送服务提示
shared.pushModalTips({
  title: '服务提示',
  content: '已运行定时任务!',
  type: 'info',
});

// 定时任务
PUSH_CONFIG.list.forEach((sendInfo, i) => {
  console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 执行定时任务`);
  //执行一个cron任务
  schedule.scheduleJob(sendInfo.cron, async () => {
    console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 正在执行定时任务...`);
    // 初始化消息当前用户token
    shared.setToken(sendInfo.token);
    // 昵称
    shared.setNick(sendInfo.nick);
    try {
      // 执行主函数
      await main();
    } catch (e) {
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
        return {
          ...sendInfo,
          done: !time.hasNext(),
          timeText: formatDate(time.next().toDate()),
          time: time.next().toDate().getTime(),
        };
      })
      .filter((sendInfo) => !sendInfo.done)
      .sort((a, b) => a.time - b.time);

    // 存在下次任务
    if (rest.length) {
      // 推送服务提示
      shared.pushModalTips({
        title: '服务提示',
        content: [
          `用户: <span style="color: #1890ff">${sendInfo.nick}</span>, 定时任务已执行完毕!`,
          `剩余任务数: <span style="color: #1890ff">${rest.length}</span> 个`,
          '下次任务信息: ',
          `用户: <span style="color: #1890ff">${rest[0].nick}</span>`,
          `时间: <span style="color: #1890ff">${rest[0].timeText}</span>`,
        ],
        type: 'info',
      });
      return;
    }
    // 推送服务提示
    shared.pushModalTips({
      title: '服务提示',
      content: [
        `用户: <span style="color: #1890ff">${sendInfo.nick}</span>, 定时任务已执行完毕!`,
        `所有定时任务均已完成!`,
      ],
      type: 'info',
    });
  });
});

// main();
