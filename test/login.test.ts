import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';
import shared from '../src/shared';
import { sleep } from '../src/utils/utils';

// 登录
describe('login', async () => {
  // 登录
  it.skip('login', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    // 等待浏览器准备完成
    await sleep(2000);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 推送参数
    await shared.setPushOptions({ nick: '', token: '' });
    const res = await handleLogin();
    expect(res).toMatchInlineSnapshot('true');
  });
});
