import ora from 'ora';
import pup from 'puppeteer-core';
import PUSH_CONFIG from '../config/push';
import STUDY_CONFIG from '../config/study';
import { installMouseHelper, pushModal } from '../utils';
import { ModalOptions } from '../utils/interface';

/**
 * @description 共享数据
 */
type Shared = {
  /**
   * @description 当前页面
   */
  page?: pup.Page;
  /**
   * @description 浏览器
   */
  broswer?: pup.Browser;
  /**
   * @description token
   */
  token: string;
  /**
   * @description 昵称
   */
  nick: string;
  /**
   * @description 来自
   */
  from: string;
  /**
   * @description 进度
   */
  progress: ora.Ora;
  /**
   * @description 获取浏览器
   */
  getBrowser(): pup.Browser | undefined;
  /**
   * @description 设置浏览器
   * @param newPage
   */
  setBrowser(newBrowser: pup.Browser): void;
  /**
   * @description 获取页面
   */
  getPage(): pup.Page | undefined;
  /**
   * @description 设置页面
   * @param newPage
   */
  setPage(newPage: pup.Page): void;
  /**
   * @description 新建页面
   */
  openPage(): Promise<boolean>;
  /**
   * @description 关闭页面
   */
  closePage(): Promise<boolean>;
  /**
   * @description 跳转网页
   * @param url
   * @param options
   */
  gotoPage(
    url: string,
    options?: pup.WaitForOptions & {
      referer?: string | undefined;
    }
  ): Promise<boolean>;
  /**
   * @description 重试跳转网页
   * @param url
   * @param options
   */
  retryPage(
    url: string,
    options?: pup.WaitForOptions & {
      referer?: string | undefined;
    }
  ): Promise<boolean>;
  /**
   * @description 推送
   */
  pushModal(options: ModalOptions): Promise<void>;
  /**
   * @description 设置token
   * @param token
   */
  setToken(token: string): void;
  /**
   * @description 设置昵称
   * @param nick
   */
  setNick(nick: string): void;
};

/**
 * @description 共享数据
 */
const shared: Shared = {
  // 默认值
  token: PUSH_CONFIG.toToken,
  nick: PUSH_CONFIG.nick,
  from: PUSH_CONFIG.from,
  progress: ora(),
  getBrowser() {
    if (this.broswer && this.broswer.isConnected()) {
      return this.broswer;
    }
  },
  setBrowser(browser) {
    // 被连接
    if (browser.isConnected()) {
      this.broswer = browser;
      return;
    }
    this.broswer = undefined;
  },
  getPage() {
    // 存在且未被关闭
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }
  },
  setPage(page) {
    // 未被关闭
    if (!page.isClosed()) {
      this.page = page;
      return;
    }
    this.page = undefined;
  },
  async openPage() {
    try {
      // 浏览器
      const broswer = this.getBrowser();
      if (broswer) {
        // 获取页面
        const page = await broswer.newPage();
        // 设置默认超时时间
        page.setDefaultTimeout(STUDY_CONFIG.timeout || 3000);
        //调试鼠标轨迹专用
        await installMouseHelper(page);
        // 设置页面
        this.setPage(page);
        return true;
      }
    } catch (e) {}
    return false;
  },
  async closePage() {
    // 获取页面
    const page = this.getPage();
    if (page) {
      // 关闭页面
      await page.close();
      return true;
    }
    return false;
  },
  async gotoPage(url, options) {
    // 页面
    const page = this.getPage();
    if (page) {
      // 捕获异常
      try {
        // 跳转
        await page.goto(url, options);
        // 响应
        return true;
      } catch (e) {
        // 重试跳转
        const res = await this.retryPage(url, options);
        if (res) {
          return true;
        }
      }
    }
    return false;
  },
  async retryPage(url, options) {
    // 捕获异常
    try {
      // 关闭页面
      this.closePage();
      // 打开页面
      const res = await this.openPage();
      if (res) {
        // 当前页面
        const page = this.getPage();
        if (page) {
          // 创建新页面，继续跳转
          await page.goto(url, options);
          return true;
        }
      }
    } catch (e) {}
    return false;
  },
  async pushModal(options) {
    // 配置
    const {
      title,
      subTitle = '',
      to = this.nick,
      content,
      type,
      from = this.from,
    } = options;
    // 推送
    await pushModal({ title, subTitle, to, content, type, from }, this.token);
  },
  setToken(token) {
    if (token) {
      this.token = token;
      return;
    }
    this.token = PUSH_CONFIG.toToken;
  },
  setNick(nick) {
    if (nick) {
      this.nick = nick;
      return;
    }
    this.token = PUSH_CONFIG.nick;
  },
};

export default shared;
