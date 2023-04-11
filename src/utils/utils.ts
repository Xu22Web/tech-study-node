import jimp from 'jimp';
import decode from 'jsqr';
import * as pup from 'puppeteer-core';

/**
 * @description 延迟
 * @param time 延迟时间
 * @returns
 */
export const sleep = (time: number = 1000) => {
  return new Promise<boolean>((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
};

/**
 * @description 获取 cookie
 * @param page 页面
 * @param name 属性名
 * @returns
 */
export const getCookie = async (page: pup.Page, name: string) => {
  // 获取当前所有cookie
  const cookies = await page.cookies();
  if (cookies.length) {
    // 判断cookie的name 是否相等
    return cookies.find((cookie) => cookie.name === name);
  }
};

/**
 * @description 获取包含域名 cookie
 * @param page 页面
 * @param name 属性名
 * @returns
 */
export const getCookieIncludesDomain = async (
  page: pup.Page,
  domain: string
) => {
  // 获取当前所有cookie
  const cookies = await page.cookies();
  if (cookies.length) {
    // 判断cookie的name 是否相等
    return cookies.filter((cookie) => cookie.domain.includes(domain));
  }
  return [];
};

/**
 * @description 字符串化 cookie
 * @param cookies
 * @returns
 */
export const stringfyCookie = (cookies: pup.Protocol.Network.Cookie[]) => {
  // 存在
  if (cookies && cookies.length) {
    // cookie
    const cookie = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    return cookie;
  }
  return '';
};

/**
 * @description 格式化任务
 * @param task
 * @returns
 */
export const formatTask = (task: {
  currentScore: number;
  dayMaxScore: number;
}) => {
  // 当前分数、最大分数、链接
  const { currentScore, dayMaxScore } = task;
  // 进度
  let rate = ~~((100 * currentScore) / dayMaxScore);
  // 成组任务
  if (dayMaxScore <= currentScore) {
    rate = 100;
  }
  return {
    currentScore,
    dayMaxScore,
    rate,
    status: rate === 100,
  };
};

/**
 * @description 获取文本
 * @param page 页面
 * @param selector 选择器
 * @returns
 */
export const getText = async (page: pup.Page, selector: string) => {
  // 内容
  return await page.$eval(selector, (node) => (<HTMLElement>node).innerText);
};

/**
 * @description 批量获取文本
 * @param page 页面
 * @param selectors 选择器
 * @returns
 */
export const getBatchText = async (page: pup.Page, selectors: string) => {
  // 内容
  return await page.$$eval(selectors, (nodes) =>
    nodes.map((node) => (<HTMLElement>node).innerText)
  );
};

/**
 * @description 获取输入文本
 * @param page 页面
 * @param selector 选择器
 * @returns
 */
export const getValueText = async (page: pup.Page, selector: string) => {
  // 内容
  return await page.$eval(selector, (node) => (<HTMLInputElement>node).value);
};

/**
 * @description 批量获取输入文本
 * @param page 页面
 * @param selectors 选择器
 * @returns
 */
export const getBatchValueText = async (page: pup.Page, selectors: string) => {
  // 内容
  return await page.$$eval(selectors, (nodes) =>
    nodes.map((node) => (<HTMLInputElement>node).value)
  );
};

/**
 * @description 获取元素节点数
 * @param page 页面
 * @param selectors 选择器
 * @returns
 */
export const getCount = async (page: pup.Page, selectors: string) => {
  // 内容
  return await page.$$eval(selectors, (nodes) => nodes.length);
};

/**
 * @description 范围
 */
export type Bounds = { x: number; y: number; width: number; height: number };

/**
 * @description 获取范围
 * @param page 页面
 * @param selector
 * @returns
 */
export const getBounds = async (
  page: pup.Page,
  selector: string
): Promise<Bounds> => {
  // 滑块
  const bounds = await page.$eval(selector, (node) => {
    // 获取范围
    const { x, y, width, height } = node.getBoundingClientRect();
    return {
      x,
      y,
      width,
      height,
    };
  });
  return bounds;
};

/**
 * @description 鼠标轨迹可视化
 * @param page 页面
 * @returns
 */
export const installMouseHelper = async (page: pup.Page) => {
  return await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return;
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        const box = document.createElement('puppeteer-mouse-pointer');
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
      puppeteer-mouse-pointer {
        pointer-events: none;
        position: absolute;
        top: 0;
        z-index: 10000;
        left: 0;
        width: 20px;
        height: 20px;
        background: rgba(0,0,0,.4);
        border: 1px solid white;
        border-radius: 10px;
        margin: -10px 0 0 -10px;
        padding: 0;
        transition: background .2s, border-radius .2s, border-color .2s;
      }
      puppeteer-mouse-pointer.button-1 {
        transition: none;
        background: rgba(0,0,0,0.9);
      }
      puppeteer-mouse-pointer.button-2 {
        transition: none;
        border-color: rgba(0,0,255,0.9);
      }
      puppeteer-mouse-pointer.button-3 {
        transition: none;
        border-radius: 4px;
      }
      puppeteer-mouse-pointer.button-4 {
        transition: none;
        border-color: rgba(255,0,0,0.9);
      }
      puppeteer-mouse-pointer.button-5 {
        transition: none;
        border-color: rgba(0,255,0,0.9);
      }
    `;
        // 更新按钮
        const updateButtons = (buttons: number) => {
          for (let i = 0; i < 5; i++) {
            box.classList.toggle(`button-${i}`, !!(buttons & (1 << i)));
          }
        };
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener(
          'mousemove',
          (e) => {
            box.style.left = `${e.pageX}px`;
            box.style.top = `${e.pageY}px`;
            updateButtons(e.buttons);
          },
          true
        );
        document.addEventListener(
          'mousedown',
          (e) => {
            updateButtons(e.buttons);
            box.classList.add(`button-${e.which}`);
          },
          true
        );
        document.addEventListener(
          'mouseup',
          (e) => {
            updateButtons(e.buttons);
            box.classList.remove(`button-${e.which}`);
          },
          true
        );
      },
      false
    );
  });
};

/**
 * @description 移除对话框
 * @param page
 */
export const installRemoveDialog = async (page: pup.Page) => {
  // 监听对话框弹出
  await page.on('dialog', async (dialog) => {
    // 清除对话框
    await dialog.accept();
  });
};

/**
 * @description 解码
 * @param buffer
 * @returns
 */
export const decodeQRCode = (buffer: Buffer) => {
  return new Promise<
    { width: number; height: number; data: string } | undefined
  >((resolve) => {
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
