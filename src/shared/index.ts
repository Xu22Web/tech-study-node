import pup from 'puppeteer-core';
import PUSH_CONFIG from '../config/push';
import STUDY_CONFIG from '../config/study';
import { log, Log } from '../controller/logs';
import {
  getTaskList,
  getTodayScore,
  getTotalScore,
  TaskList,
  UserInfo,
} from '../controller/user';
import {
  installMouseHelper,
  installRemoveDialog,
  pushModal,
  sleep,
} from '../utils';
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
  log: Log;
  /**
   * @description 用户信息
   */
  userInfo?: UserInfo;
  /**
   * @description 任务列表
   */
  taskList?: TaskList;
  /**
   * @description 总分
   */
  totalScore?: number;
  /**
   * @description 当天分数
   */
  todayScore?: number;
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
   * @description 服务推送
   */
  pushModalTips(options: Omit<ModalOptions, 'to' | 'from'>): Promise<void>;
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
  /**
   * @description 获取用户信息
   */
  getUserInfo(): Promise<UserInfo | undefined>;
  /**
   * @description 获取任务列表
   */
  getTaskList(): Promise<TaskList | undefined>;
  /**
   * @description 获取总分
   */
  getTotalScore(): Promise<number | undefined>;
  /**
   * @description 获取当天分数
   */
  getTodayScore(): Promise<number | undefined>;
};

/**
 * @description 共享数据
 */
const shared: Shared = {
  // 默认值
  token: PUSH_CONFIG.toToken,
  nick: PUSH_CONFIG.nick,
  from: PUSH_CONFIG.from,
  log: log(),
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
        // 移除弹出对话框
        await installRemoveDialog(page);
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
    // 推送配置
    const { token, enabled } = PUSH_CONFIG;
    // 启用推送
    if (enabled) {
      // 推送
      await pushModal(
        { title, subTitle, to, content, type, from },
        token,
        this.token
      );
    }
  },
  async pushModalTips(options) {
    // 配置
    const { title, subTitle = '', content, type } = options;
    // 服务推送配置
    const { nick, from, toToken, token, enabled } = PUSH_CONFIG;
    // 启用推送
    if (enabled) {
      // 推送
      await pushModal(
        { title, subTitle, to: nick, content, type, from },
        token,
        toToken
      );
    }
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
    this.nick = PUSH_CONFIG.nick;
  },
  async getUserInfo() {
    shared.log.loading('正在获取用户信息..');
    // 获取用户信息
    this.userInfo = await this.getUserInfo();
    // 请求速率限制
    await sleep(STUDY_CONFIG.rateLimit);
    if (this.userInfo) {
      this.log.success('获取用户信息成功!');
      return this.userInfo;
    }
    this.log.fail('获取用户信息失败!');
  },
  async getTaskList() {
    shared.log.loading('正在获取任务列表...');
    // 获取任务列表
    this.taskList = await getTaskList();
    // 请求速率限制
    await sleep(STUDY_CONFIG.rateLimit);
    if (this.taskList) {
      this.log.success('获取任务列表成功!');
      return this.taskList;
    }
    this.log.fail('获取任务列表失败!');
  },
  async getTotalScore() {
    shared.log.loading('正在获取总分...');
    // 获取总分
    this.totalScore = await getTotalScore();
    // 请求速率限制
    await sleep(STUDY_CONFIG.rateLimit);
    if (this.totalScore !== undefined) {
      this.log.success('获取总分成功!');
      return this.totalScore;
    }
    this.log.fail('获取总分失败!');
  },
  async getTodayScore() {
    shared.log.loading('正在获取当天分数...');
    // 获取当天分数
    this.todayScore = await getTodayScore();
    // 请求速率限制
    await sleep(STUDY_CONFIG.rateLimit);
    if (this.todayScore !== undefined) {
      this.log.success('获取当天分数成功!');
      return this.todayScore;
    }
    this.log.fail('获取当天分数失败!');
  },
};

export default shared;
