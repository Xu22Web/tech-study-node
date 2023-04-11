import fs from 'fs';
import path from 'path';
import * as pup from 'puppeteer-core';
import STUDY_CONFIG from '../config/study';
import { getCookieIncludesDomain } from './utils';

// 缓存路径
const { cookieCachePath } = STUDY_CONFIG;

/**
 * @description 读取 cookie 缓存
 * @param cookieId
 */
export const readCookieCache = async (cookieId: string) => {
  // 缓存是否存在
  const exists = existsCookieCache(cookieId);
  if (!exists) {
    return null;
  }
  // 检查文件路径
  const cookieFileCachePath = path.join(cookieCachePath, `${cookieId}.json`);
  // 读取 json 文件
  const cookiesJSON = await fs.promises.readFile(cookieFileCachePath, 'utf-8');
  // 转换为 cookie
  const cookies = <pup.Protocol.Network.Cookie[]>JSON.parse(cookiesJSON);
  return cookies;
};

/**
 * @description 写入 cookie 缓存
 * @param page
 * @param cookieId
 */
export const writeCookieCache = async (page: pup.Page, cookieId: string) => {
  // 创建文件夹
  if (!fs.existsSync(cookieCachePath)) {
    await fs.promises.mkdir(cookieCachePath);
  }
  // 获取 cookies
  const cookies = await getCookieIncludesDomain(page, 'xuexi.cn');
  // 写入文件路径
  const cookieFileCachePath = path.join(cookieCachePath, `${cookieId}.json`);
  // 写入文件
  await fs.promises.writeFile(cookieFileCachePath, JSON.stringify(cookies));
  return true;
};

/**
 * @description 存在 cookie 缓存
 * @param cookieId
 */
export const existsCookieCache = (cookieId: string) => {
  // 检查文件夹
  if (!fs.existsSync(cookieCachePath)) {
    return false;
  }
  // 检查文件路径
  const cookieFileCachePath = path.join(cookieCachePath, `${cookieId}.json`);
  if (!fs.existsSync(cookieFileCachePath)) {
    return false;
  }
  return true;
};
