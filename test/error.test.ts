import pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import { gotoPage } from '../src/utils';

describe('error', () => {
  it.skip('goto', async () => {
    const browser = await pup.launch(PUP_CONFIG);
    const page = await browser.newPage();
    try {
      const res = await gotoPage(page, 'https://www.google.com/', {
        timeout: 3000,
      });
      expect(res).toMatchInlineSnapshot('undefined');
    } catch (error: any) {}
  });
});
