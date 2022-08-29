import pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';
import handleReadNews from '../src/controller/news';
import handleWatchVideo from '../src/controller/video';

// 看视频 | 读文章
describe('watch', async () => {
  // 读文章
  it.skip('news', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    // 登录
    await handleLogin(page);
    const res = await handleReadNews(page);
    expect(res).toMatchInlineSnapshot('true');
  });
  // 看视频
  it.skip('video', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    // 登录
    await handleLogin(page);
    const res = await handleWatchVideo(page);
    expect(res).toMatchInlineSnapshot('true');
  });
});
