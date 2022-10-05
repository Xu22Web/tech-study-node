import pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleExam from '../src/controller/exam';
import handleLogin from '../src/controller/login';
import shared from '../src/shared';

// 答题
describe('exam', async () => {
  // 每日答题
  it.skip('practice', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await handleExam(0);
    expect(res).toMatchInlineSnapshot('true');
  });
  // 每周答题
  it.skip('weekly', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await handleExam(1);
    expect(res).toMatchInlineSnapshot('true');
  });
  // 专项练习
  it('paper', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await handleExam(2);
    expect(res).toMatchInlineSnapshot('true');
  });
});
