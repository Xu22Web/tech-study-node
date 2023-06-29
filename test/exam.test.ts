import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import handleExam from '../src/controller/exam';
import handleLogin from '../src/controller/login';
import shared from '../src/shared';
import { sleep } from '../src/utils/utils';

// 答题
describe('exam', async () => {
  // 每日答题
  it.skip('practice', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    // 等待浏览器准备完成
    await sleep(2000);
    shared.setBrowser(broswer);
    await shared.openPage();
    shared.log.start();
    // 登录
    await handleLogin();
    const res = await handleExam();
    shared.log.finish();
    expect(res).toMatchInlineSnapshot('true');
  });
});
