import { describe, expect, it } from 'vitest';
import shared from '../src/shared';

describe('log', () => {
  it('info', () => {
    shared.log.start();
    shared.log.info('测试');
    shared.log.finish();
  });
  it('success', () => {
    shared.log.start();
    shared.log.success('测试');
    shared.log.finish();
  });
  it('loading', () => {
    shared.log.start();
    shared.log.loading('测试');
    shared.log.finish();
  });
  it('loaded', () => {
    shared.log.start();
    shared.log.loaded('测试');
    shared.log.finish();
  });
  it('fail', () => {
    shared.log.start();
    shared.log.fail('测试');
    shared.log.finish();
  });
  it('warn', () => {
    shared.log.start();
    shared.log.warn('测试');
    shared.log.finish();
  });
  it('clear', () => {
    shared.log.clear();
  });
  it('clean', () => {
    shared.log.clean();
  });
});
