import { describe, it } from 'vitest';
import shared from '../src/shared';

describe('log', () => {
  it.skip('info', () => {
    shared.log.start();
    shared.log.info('测试');
    shared.log.finish();
  });
  it.skip('success', () => {
    shared.log.start();
    shared.log.success('测试');
    shared.log.finish();
  });
  it.skip('loading', () => {
    shared.log.start();
    shared.log.loading('测试');
    shared.log.finish();
  });
  it.skip('loaded', () => {
    shared.log.start();
    shared.log.loaded('测试');
    shared.log.finish();
  });
  it.skip('fail', () => {
    shared.log.start();
    shared.log.fail('测试');
    shared.log.finish();
  });
  it.skip('warn', () => {
    shared.log.start();
    shared.log.warn('测试');
    shared.log.finish();
  });
  it.skip('clear', () => {
    shared.log.clear();
  });
  it.skip('autoClean', () => {
    shared.log.autoClean();
  });
});
