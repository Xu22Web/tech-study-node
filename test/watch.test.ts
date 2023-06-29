import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';
import handleWatch from '../src/controller/watch';
import shared from '../src/shared';
import { sleep } from '../src/utils/utils';

// 看视频 | 读文章
describe('watch', async () => {
  // 读文章
  it.skip('news', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    // 等待浏览器准备完成
    await sleep(2000);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 推送参数
    await shared.setPushOptions({ nick: '', token: '' });
    // 登录
    await handleLogin();
    const res = await handleWatch(0);
    expect(res).toMatchInlineSnapshot('true');
  });
  // 看视频
  it.skip('video', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    // 等待浏览器准备完成
    await sleep(2000);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 推送参数
    await shared.setPushOptions({ nick: '', token: '' });
    // 登录
    await handleLogin();
    const res = await handleWatch(1);
    expect(res).toMatchInlineSnapshot('true');
  });
});
