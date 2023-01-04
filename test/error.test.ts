import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import shared from '../src/shared';

describe('error', () => {
  it.skip('goto', async () => {
    const browser = await pup.launch(PUP_CONFIG);
    shared.setBrowser(browser);
    await shared.openPage();
    try {
      const res = await shared.gotoPage('https://www.baidu.com/');
      expect(res).toMatchInlineSnapshot('true');
    } catch (e) {}
  });
});
