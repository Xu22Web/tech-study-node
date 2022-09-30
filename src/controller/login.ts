import fs from 'fs';
import path from 'path';
import pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import shared from '../shared';
import { getCookie } from '../utils';
/**
 * @description 二维码保存位置
 */
const qrcodePath = path.join(STUDY_CONFIG.qrcodePath, 'login.png');

/**
 * @description 处理登录
 * @param broswer 浏览器
 */
const handleLogin = async () => {
  // 获取页面
  const res = await shared.gotoPage(URL_CONFIG.login, {
    waitUntil: 'domcontentloaded',
  });
  // 页面
  const page = shared.getPage();
  // 跳转失败
  if (!res || !page) {
    return false;
  }
  // 重试次数
  let retryCount = 0;
  // 登录结果
  let result = false;
  // 允许重试次数内
  while (retryCount <= STUDY_CONFIG.maxRetryLoginCount) {
    // 尝试登录
    await tryLogin(page);
    // 登录状态
    const loginStatus = await getLoginStatus(page);
    // 登录成功
    if (loginStatus) {
      result = true;
      break;
    }
    // 登录次数
    retryCount++;
  }
  // 是否删除二维码
  if (STUDY_CONFIG.qrcodeLocalEnabled && STUDY_CONFIG.qrcodeAutoClean) {
    // 删除二维码
    fs.unlink(qrcodePath, () => {
      shared.log.success('登录二维码已删除!');
    });
  }
  // 登录
  return result;
};

/**
 * @description 获取登录二维码
 * @returns
 */
const getLoginQRCode = async (page: pup.Page) => {
  // 刷新二维码
  await RefreshQRCode(page);
  // 图片源
  const imgSrc = await page.$eval(
    '.login_qrcode_content img',
    (node) => (<HTMLImageElement>node).src
  );
  // 数据
  const base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, '');
  // buffer
  const dataBuffer = Buffer.from(base64Data, 'base64');
  // 保存二维码
  if (STUDY_CONFIG.qrcodeLocalEnabled) {
    // 写入文件
    fs.writeFileSync(qrcodePath, dataBuffer);
    shared.log.info(`登录二维码保存路径: ${qrcodePath}`);
  }
  return { src: imgSrc, buffer: dataBuffer };
};

/**
 * @description 刷新登录二维码
 * @param page
 */
const RefreshQRCode = async (page: pup.Page) => {
  // 等待加载完毕
  await page.waitForFunction(() => {
    const loading = document.querySelector<HTMLDivElement>('.login_loading');
    return loading && loading.style.display === 'none';
  });
  // 需要刷新
  const needFresh = await page.$eval(
    '.login_qrcode_refresh',
    (node) => (<HTMLDivElement>node).style.display !== 'none'
  );
  // 需要刷新
  if (needFresh) {
    // 点击刷新
    await page.$eval('.login_qrcode_refresh span', (node) => {
      (<HTMLElement>node).click();
    });
  }
};

/**
 * @description 获取登录状态
 * @returns
 */
const getLoginStatus = (page: pup.Page) => {
  return new Promise<boolean>((resolve) => {
    shared.log.loading('等待登录中...');
    // 定时
    const timer = setInterval(async () => {
      // 获取 cookie
      const cookie = await getCookie(page, 'token');
      if (cookie) {
        // 清除定时
        clearInterval(timer);
        // 清除超时延迟
        clearTimeout(timeout);
        resolve(true);
        return;
      }
      // 刷新二维码
      await RefreshQRCode(page);
    }, 500);
    // 超时延迟
    const timeout = setTimeout(() => {
      // 清除定时
      clearInterval(timer);
      shared.log.fail('登录超时, 请重试!');
      resolve(false);
    }, STUDY_CONFIG.loginTimeout);
  });
};

/**
 * @description 登录
 */
const tryLogin = async (page: pup.Page) => {
  // 获取二维码
  const qrData = await getLoginQRCode(page);
  if (qrData) {
    // 二维码信息
    const { src } = qrData;
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
    shared.pushModal({
      title: '学习提示',
      content: ['扫一扫, 登录学习强国!', imgWrap],
      type: 'info',
    });
  }
};

export default handleLogin;
