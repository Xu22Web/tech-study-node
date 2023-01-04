import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';
import handleWatch from '../src/controller/watch';
import shared from '../src/shared';

// 看视频 | 读文章
describe('watch', async () => {
  // 读文章
  it.skip('news', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await handleWatch(0);
    expect(res).toMatchInlineSnapshot('true');
  });
  // 看视频
  it.skip('video', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await handleWatch(1);
    expect(res).toMatchInlineSnapshot('true');
  });
});
