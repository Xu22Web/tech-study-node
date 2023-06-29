import * as pup from 'puppeteer-core';
import { describe, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import shared from '../src/shared';

// 登录
describe('extension', async () => {
  // uBlock
  it.skip('uBlock', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
  });
});
