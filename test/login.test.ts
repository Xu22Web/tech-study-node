import pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleLogin from '../src/controller/login';

// 登录
describe('login', async () => {
  // 登录
  it.skip('login', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    const res = await handleLogin(page);
    expect(res).toMatchInlineSnapshot();
  });
});
