import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';
import shared from '../src/shared';

// 登录
describe('login', async () => {
  // 登录
  it.skip('login', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    const res = await handleLogin();
    expect(res).toMatchInlineSnapshot('true');
  });
});
