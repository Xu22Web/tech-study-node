import fs from 'fs';
import path from 'path';
import * as pup from 'puppeteer-core';
import jimp from 'jimp';
import decode from 'jsqr';
import STUDY_CONFIG from '../config/study';
import URL_CONFIG from '../config/url';
import shared from '../shared';
import { getCookie, getHighlightHTML, sleep, getCookieIncludesDomain } from '../utils';
import { getUserInfo } from './user';

/**
 * @description 二维码保存路径
 */
const { qrcodePath, cookieCachePath } = STUDY_CONFIG;

/**
 * @description 二维码文件保存路径
 */
const filePath = path.join(qrcodePath, 'login.png');

/**
 * 写入用户的 cookie 缓存
 * @param page
 * @param schedule
 */
export const readCookieCache = async (cookieId: string) => {
  const cookieFileCachePath = path.join(cookieCachePath, `${cookieId}.json`);
  if (!fs.existsSync(cookieFileCachePath)) return null;

  const cookiesJSON = await fs.promises.readFile(cookieFileCachePath, 'utf-8');
  const cookies = JSON.parse(cookiesJSON) as pup.Protocol.Network.Cookie[];
  return cookies;
};

/**
 * 写入用户的 cookie 缓存
 * @param page
 * @param schedule
 */
export const writeCookieCache = async (cookieId: string) => {
  const gotoRes = await shared.gotoPage(URL_CONFIG.home, {
    waitUntil: 'domcontentloaded',
  });

  // 页面
  const page = shared.getPage();
  // 跳转失败
  if (!gotoRes || !page) {
    return;
  }

  if (!fs.existsSync(cookieCachePath)) {
    await fs.promises.mkdir(cookieCachePath);
  }

  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, 'xuexi.cn');
  const cookieFileCachePath = path.join(cookieCachePath, `${cookieId}.json`);
  await fs.promises.writeFile(cookieFileCachePath, JSON.stringify(cookies));
  shared.log.info('cookie 缓存写入');
};

/**
 * 尝试先用缓存的 cookie 登录
 */
export const tryLoginByCacheCookie = async (cookieId: string) => {
  const gotoRes = await shared.gotoPage(URL_CONFIG.home, {
    waitUntil: 'domcontentloaded',
  });
  // 页面
  const page = shared.getPage();
  // 跳转失败
  if (!gotoRes || !page) {
    return false;
  }

  const cookies = await readCookieCache(cookieId);
  if (!cookies) {
    return false;
  }

  await page.setCookie(...cookies);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const res = await getUserInfo();
  if (!res) {
    shared.log.info('cookie 缓存过期');
    return false;
  }

  shared.log.info('使用 cookie 缓存登录成功');
  await writeCookieCache(cookieId);
  return true;
};

/**
 * @description 处理登录
 * @param broswer 浏览器
 */
const handleLogin = async () => {
  if (!shared.schedule) return false;

  const succeed = await tryLoginByCacheCookie(shared.schedule.nick);
  if (succeed) {
    return true;
  }

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
    // 尝试登录
    await tryLogin(page);
    // 登录状态
    const loginStatus = await getLoginStatus(page);
    // 登录成功
    if (loginStatus) {
      result = true;
      await writeCookieCache(shared.schedule.nick);
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
        const loading = document.querySelector<HTMLDivElement>('.login_loading');
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
const tryLogin = async (page: pup.Page) => {
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
        href="dtxuexi://appclient/page/study_feeds?url=${encodeURIComponent(data)}"
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

/**
 * @description 解码
 * @param buffer
 * @returns
 */
const decodeQRCode = (buffer: Buffer) => {
  return new Promise<{ width: number; height: number; data: string } | undefined>((resolve) => {
    jimp.read(buffer, (err, image) => {
      if (!err) {
        const { data, width, height } = image.bitmap;
        // 转换为 unit8
        const unit8 = new Uint8ClampedArray(data);
        // 解码
        const res = decode(unit8, width, height);
        if (res) {
          resolve({
            width,
            height,
            data: res.data,
          });
          return;
        }
      }
      resolve(undefined);
    });
  });
};

export default handleLogin;
