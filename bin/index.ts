import pup from 'puppeteer-core';
import ora from 'ora';
import schedule from 'node-schedule';
import paser from 'cron-parser';
import PUP_CONFIG from '../src/config/pup';
import PUSH_CONFIG from '../src/config/push';
import handleBrowser from '../src/app';
import { initMessage, formatDate, pushModal } from '../src/utils';

// 主函数
const main = async () => {
  // 浏览器
  const browserProgress = ora();

  browserProgress.start('正在打开浏览器...');
  // 浏览器
  const browser = await pup.launch(PUP_CONFIG);
  browserProgress.succeed('已打开浏览器!');

  // 处理浏览器
  await handleBrowser(browser);
  await browser.close();
  browserProgress.info('已关闭浏览器!');
  return;
};
// 推送服务提示
pushModal(
  {
    title: '服务提示',
    content: '已运行定时任务!',
    type: 'info',
    to: '管理员',
  },
  PUSH_CONFIG.toToken
);

// 定时任务
PUSH_CONFIG.list.forEach((sendInfo, i) => {
  //执行一个cron任务
  schedule.scheduleJob(sendInfo.cron, async () => {
    console.log(`${i + 1} / ${PUSH_CONFIG.list.length} 正在执行定时任务...`);
    // 初始化消息 配置当前用户 token 昵称 nick
    initMessage(sendInfo.token, sendInfo.nick);
    try {
      // 执行主函数
      await main();
      // 剩余任务
      const rest = PUSH_CONFIG.list
        .map((sendInfo) => {
          // 任务时间
          const time = paser.parseExpression(sendInfo.cron);
          return {
            ...sendInfo,
            done: time.hasNext(),
            timeText: formatDate(time.next().toDate()),
            time: time.next().toDate().getTime(),
          };
        })
        .filter((sendInfo) => !sendInfo.done)
        .sort((a, b) => a.time - b.time);
      // 推送服务提示
      pushModal(
        {
          title: '服务提示',
          content: [
            `用户: <span style="color: #1890ff">${sendInfo.nick}</span>, 定时任务已执行完毕!`,
            `剩余任务数: <span style="color: #1890ff">${rest.length}</span> 个`,
            '下次任务信息: ',
            `用户: <span style="color: #1890ff">${rest[0].nick}</span>`,
            `时间: <span style="color: #1890ff">${rest[0].time}</span>`,
          ],
          type: 'info',
          to: '管理员',
        },
        PUSH_CONFIG.toToken
      );
    } catch (error: any) {
      // 推送服务提示
      pushModal(
        {
          title: '服务提示',
          content: ['发生错误!', String(error)],
          type: 'fail',
          to: '管理员',
        },
        PUSH_CONFIG.toToken
      );
    }
  });
});

// main();
