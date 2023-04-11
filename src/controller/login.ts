import fs from 'fs';
import path from 'path';
import * as pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import shared from '../shared';
import { readCookieCache, writeCookieCache } from '../utils/cookieCache';
import { getHighlightHTML } from '../utils/html';
import { decodeQRCode, getCookie, sleep } from '../utils/utils';
import { getUserInfo } from './user';

/**
 * @description 二维码保存路径
 */
const { qrcodePath } = STUDY_CONFIG;

/**
 * @description 二维码文件保存路径
 */
const filePath = path.join(qrcodePath, 'login.png');

/**
 * @description 处理登录
 * @param broswer 浏览器
 */
const handleLogin = async () => {
  // 缓存 cookie 登录
  const res = await handleLoginByCacheCookie();
  if (res) {
    return true;
  }
  // 二维码登录
  return await handleLoginByQRCode();
};

/**
 * @description 缓存的 cookie 登录
 */
export const handleLoginByCacheCookie = async () => {
  // 打开首页
  const gotoRes = await shared.gotoPage(URL_CONFIG.home, {
    waitUntil: 'domcontentloaded',
  });
  // 页面
  const page = shared.getPage();
  // 跳转失败
  if (!gotoRes || !page) {
    return false;
  }
  // cookie id
  const cookieId = shared.pushOptions!.nick;
  // 读取缓存 cookie
  const cookies = await readCookieCache(cookieId);
  if (!cookies) {
    shared.log.info(`CookieId: ${cookieId} 的 cookie 缓存不存在`);
    return false;
  }
  // 设置 cookie
  await page.setCookie(...cookies);
  // 重载页面
  await page.reload({ waitUntil: 'domcontentloaded' });

  // 尝试获取用户信息
  const res = await getUserInfo();
  if (!res) {
    shared.log.info(`CookieId: ${cookieId} 的 cookie 缓存过期`);
    return false;
  }

  shared.log.success('使用 cookie 缓存登录成功');
  // 写入新的 cookie
  const success = await writeCookieCache(page, cookieId);
  if (success) {
    shared.log.info('更新 cookie 缓存');
  }
  return true;
};

/**
 * @description 尝试二维码登录
 * @returns
 */
const handleLoginByQRCode = async () => {
  // 访问登录页
  const gotoRes = await shared.gotoPage(URL_CONFIG.login, {
    waitUntil: 'domcontentloaded',
  });
  // 页面
  const page = shared.getPage();
  // 跳转失败
  if (!gotoRes || !page) {
    return false;
  }

  // 尝试次数
  let tryCount = 0;
  // 登录结果
  let result = false;
  // 允许重试次数内
  while (tryCount < STUDY_CONFIG.maxTryLoginCount) {
    // 尝试二维码登录
    await tryLoginByQRCode(page);
    // 登录状态
    const loginStatus = await getLoginStatus(page);
    // 登录成功
    if (loginStatus) {
      result = true;
      // 写入缓存
      const res = await writeCookieCache(page, shared.pushOptions!.nick);
      if (res) {
        shared.log.info('写入 cookie 缓存');
      }
      break;
    }
    // 登录次数
    tryCount++;
  }
  // 是否删除二维码
  if (STUDY_CONFIG.qrcodeLocalEnabled && STUDY_CONFIG.qrcodeAutoClean) {
    // 文件存在
    if (fs.existsSync(filePath)) {
      // 删除二维码
      fs.unlink(filePath, () => {
        shared.log.success('登录二维码已删除!');
      });
    }
  }
  // 登录
  return result;
};

/**
 * @description 获取登录二维码
 * @returns
 */
const getLoginQRCode = async (
  page: pup.Page
): Promise<{
  width: number;
  height: number;
  data: string;
  buffer: Buffer;
}> => {
  // 刷新二维码
  await refreshQRCode(page);
  // 图片源
  const imgSrc = await page.$eval(
    '.login_qrcode_content img',
    (node) => (<HTMLImageElement>node).src
  );
  // 数据
  const base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, '');
  // buffer
  const dataBuffer = Buffer.from(base64Data, 'base64');
  // 解码
  const res = await decodeQRCode(dataBuffer);
  if (res) {
    return { ...res, buffer: dataBuffer };
  }
  await sleep(2000);
  // 再次请求
  return await getLoginQRCode(page);
};

/**
 * @description 刷新登录二维码
 * @param page
 */
const refreshQRCode = async (page: pup.Page) => {
  // 等待加载完毕
  await page.evaluate((time) => {
    return new Promise<boolean>((resolve) => {
      // 定时器
      const timer = setInterval(() => {
        // 加载
        const loading =
          document.querySelector<HTMLDivElement>('.login_loading');
        // 加载完毕
        if (loading && loading.style.display === 'none') {
          // 清除定时器
          clearInterval(timer);
          // 清除超时延迟
          clearTimeout(timeout);
          resolve(true);
        }
      }, 100);
      // 超时
      const timeout = setTimeout(() => {
        // 清除定时器
        clearInterval(timer);
        resolve(false);
      }, time);
    });
  }, STUDY_CONFIG.timeout);
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
    }, 100);
    // 超时延迟
    const timeout = setTimeout(() => {
      // 清除定时器
      clearInterval(timer);
      shared.log.fail('登录超时, 请重试!');
      resolve(false);
    }, STUDY_CONFIG.loginTimeout);
  });
};

/**
 * @description 登录
 */
const tryLoginByQRCode = async (page: pup.Page) => {
  // 获取二维码
  const qrData = await getLoginQRCode(page);
  // 二维码信息
  const { width, height, data, buffer } = qrData;
  // 保存二维码
  if (STUDY_CONFIG.qrcodeLocalEnabled) {
    // 二维码文件夹不存在
    if (!fs.existsSync(qrcodePath)) {
      // 创建路径
      fs.mkdirSync(qrcodePath);
    }
    // 写入文件
    fs.writeFileSync(filePath, buffer);
    shared.log.info(`登录二维码保存路径: ${filePath}`);
  }
  // src
  const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encodeURIComponent(
    data
  )}`;
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
         <img src="${imgSrc}" style="" />
       </div>
     </div>
`;
  // 跳转链接
  const aWrap = `
   <div>
      或在浏览器
      <a
        href="dtxuexi://appclient/page/study_feeds?url=${encodeURIComponent(
          data
        )}"
        style="text-decoration: none"
        >${getHighlightHTML('打开学习强国APP')}</a
      >
    </div>
  `;
  // 推送学习提示
  shared.pushModal({
    title: '学习提示',
    content: ['扫一扫, 登录学习强国!', aWrap, imgWrap],
    type: 'info',
  });
};

export default handleLogin;
