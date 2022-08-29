import pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleExam from '../src/controller/exam';
import handleLogin from '../src/controller/login';

// 答题
describe('exam', async () => {
  it.skip('practice', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    // 登录
    await handleLogin(page);
    const res = await handleExam(page, 0);
    expect(res).toMatchInlineSnapshot('undefined');
  });
  it.skip('weekly', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    // 登录
    await handleLogin(page);
    const res = await handleExam(page, 1);
    expect(res).toMatchInlineSnapshot();
  });
  it.skip('paper', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    const page = await broswer.newPage();
    // 登录
    await handleLogin(page);
    const res = await handleExam(page, 2);
    expect(res).toMatchInlineSnapshot();
  });
});
