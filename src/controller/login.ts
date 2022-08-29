import ora from 'ora';
import pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import { getCookie, pushModal, gotoPage } from '../utils';
/**
 * @descrtion 当前重试次数
 */
let currentRetryCount = 0;
/**
 * @description 处理登录
 * @param broswer 浏览器
 */
const handleLogin = async (page: pup.Page) => {
  // 获取页面
  const res = await gotoPage(page, URL_CONFIG.login, {
    waitUntil: 'domcontentloaded',
  });
  // 跳转失败
  if (!res) {
    return {
      page,
      result: false,
    };
  }
  // 新页面
  page = res.page;
  // 登录结果
  const result = await tryLogin(page);
  // 登录
  return {
    page,
    result,
  };
};
/**
 * @description 获取登录二维码
 * @param page
 * @returns
 */
const getLoginQRCode = async (page: pup.Page) => {
  // 等待加载完毕
  await page.waitForFunction(() => {
    const loading = document.querySelector<HTMLDivElement>('.login_loading');
    return loading && loading.style.display === 'none';
  }, {});
  // 需要刷新
  const needFresh = await page.$eval(
    '.login_qrcode_refresh',
    (node) => (<HTMLDivElement>node).style.display !== 'none'
  );
  // 刷新
  if (needFresh) {
    // 点击刷新
    await page.click('.login_qrcode_refresh span');
  }
  // 图片源
  const imgSrc = await page.$eval(
    '.login_qrcode_content img',
    (node) => (<HTMLImageElement>node).src
  );
  // 数据
  const base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, '');
  const dataBuffer = Buffer.from(base64Data, 'base64');
  return { page, src: imgSrc, buffer: dataBuffer };
};

/**
 * @description 获取登录状态
 * @param page
 * @returns
 */
const getLoginStatus = (page: pup.Page) => {
  return new Promise<boolean>((resolve) => {
    // 登录进度
    const loginProgress = ora();
    loginProgress.start('等待登录中...');
    // 定时
    const timer = setInterval(async () => {
      // 获取 cookie
      const cookie = await getCookie(page, 'token');
      if (cookie) {
        // 清除定时
        clearInterval(timer);
        // 清除超时延迟
        clearTimeout(timeout);
        loginProgress.succeed('登录成功!');
        resolve(true);
      }
    }, 500);
    // 超时延迟
    const timeout = setTimeout(() => {
      clearInterval(timer);
      loginProgress.fail('登录超时,请重试!');
      resolve(false);
    }, STUDY_CONFIG.loginTimeout);
  });
};
/**
 * @description 登录
 * @param page
 */
const tryLogin = async (page: pup.Page): Promise<boolean> => {
  // 获取二维码
  const { src } = await getLoginQRCode(page);
  // 图片
  const imgWrap = `
  <div style="padding: 10px 0">
  <div
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: #f7f7f7;
      border-radius: 10px;
    "
  >
      <img src="${src}" style="" />
    </div>
  </div>
  `;
  // 推送学习提示
  pushModal({
    title: '学习提示',
    content: ['扫一扫, 登录学习强国!', imgWrap],
    type: 'info',
  });
  // 登录状态
  const res = await getLoginStatus(page);
  // 登录失败
  if (!res) {
    currentRetryCount++;
    if (currentRetryCount <= STUDY_CONFIG.maxRetryLoginCount) {
      // 重试
      return await tryLogin(page);
    }
    return false;
  }
  return true;
};

export default handleLogin;
