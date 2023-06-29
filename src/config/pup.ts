import * as pup from 'puppeteer-core';

// 扩展路径
const pathToExtension = '../.extension/uBlock';

/**
 * @description puppeteer 配置
 * @link {@link https://pptr.dev/api/puppeteer.launchoptions puppeteer 官方配置文档}
 */
const PUP_CONFIG: pup.PuppeteerLaunchOptions = {
  /**
   * @description 无头模式
   * @example new 非图形界面 false 图形界面
   */
  headless: 'new',
  /**
   * @description 开发工具
   */
  devtools: false,
  /**
   * @description 默认视口大小
   */
  defaultViewport: {
    width: 1200,
    height: 900,
  },
  /**
   * @description 传递给浏览器实例的其他参数
   */
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`,
  ],
  /**
   * @description 显示浏览器进程信息
   */
  // dumpio: true,
  /**
   * @description 可执行文件的路径
   * @example 'google-chrome' for linux, '.local_chromium/chrome.exe' from win
   */
  executablePath: '.local_chromium/chrome.exe',
  /**
   * @description 忽略默认配置
   */
  ignoreDefaultArgs: ['--enable-automation'],
  /**
   * @description 导航期间忽略 HTTPS 错误
   */
  ignoreHTTPSErrors: true,
  /**
   * @description 等待浏览器实例启动的最长时间
   */
  timeout: 10000,
};
export default PUP_CONFIG;
