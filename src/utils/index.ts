import paser from 'cron-parser';
import * as pup from 'puppeteer-core';
import { pushPlus } from '../apis';
import { Schedule } from '../config/schedule';
import {
  Bounds,
  ModalOptions,
  Point,
  PushOptions,
  RefreshCookieJob,
  StudyJobParams,
} from './interface';

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
 * @description 推送
 * @param options 选项
 * @returns
 */
export const pushMessage = async (options: PushOptions) => {
  // 选项
  const { title, content, template, fromToken, toToken } = options;
  // 推送
  const res = await pushPlus(fromToken, title, content, template, toToken);
  return res;
};

/**
 * @description 创建模态框
 * @param options 选项
 * @returns
 */
const createModal = (options: ModalOptions) => {
  // 配置
  const { title, subTitle = '', to = '', content, type, from } = options;
  // 内容文本
  let contentText = '';
  if (Array.isArray(content)) {
    contentText = content.map((ct) => `<div>${ct}</div>`).join('');
  } else {
    contentText = content;
  }
  // 日期
  const dateTime = formatDateTime();
  // 类型html
  let typeHTML = '';
  if (type && type.length) {
    if (type === 'info') {
      typeHTML = `
      <svg
       viewBox="64 64 896 896"
       style="color: #1890ff; width: 18px; height: 18px"
       fill="currentColor"
       aria-hidden="true"
     >
       <path
         d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"
       ></path>
     </svg>`;
    }
    if (type === 'warn') {
      typeHTML = `
      <svg
        viewBox="64 64 896 896"
        style="color: #faad14; width: 18px; height: 18px"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z"
        ></path>
      </svg>
      `;
    }
    if (type === 'success') {
      typeHTML = `
      <svg
        viewBox="64 64 896 896"
        style="color: #52c41a; width: 18px; height: 18px"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"
        ></path>
      </svg>
      `;
    }
    if (type === 'fail') {
      typeHTML = `
      <svg
        viewBox="64 64 896 896"
        style="color: #ff4d4f; width: 18px; height: 18px"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z"
        ></path>
      </svg>
      `;
    }
  }
  // 类型
  const typeWrap = `
  <span
    style="
      padding-right: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
    "
  >
    ${typeHTML}
  </span>
  `;
  // 基础html
  const baseHTML = `
  <div
  style="
    padding: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
  "
>
  <div
    style="
      background: #ffffff;
      box-shadow: 1px 1px 8px -1px #dadada;
      padding: 5px 10px;
      border-radius: 5px;
      width: 100%;
    "
  >
    <div
      style="
        display: flex;
        justify-content: space-between;
        padding: 5px;
        border-bottom: 1px solid #eee;
      "
    >
      <div style="display: flex; justify-content: center; align-items: center">
        ${typeWrap}
        <span style="padding-left: 5px; font-size: 18px">${title}</span>
      </div>
      <div style="font-size: 16px; color: #999">${subTitle}</div>
    </div>
    <div></div>

    <div style="padding:10px 5px; font-size: 16px; min-height: 80px">
      <div>
        ${getHighlightHTML(to)}, 你好!
      </div>
      <div style="line-height: 28px;">${contentText}</div>
    </div>
    <div
      style="
        font-size: 14px;
        padding: 5px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      "
    >
      <div style="color: #999">${dateTime}</div>
      <div>
        <span>来自</span>
        <span style="color: #1890ff; padding-left: 1px">${from}</span>
      </div>
    </div>
  </div>
</div>  
  `;
  return baseHTML;
};
/**
 * @description 推送模态框
 * @param options
 * @param fromToken
 * @param toToken
 * @returns
 */
export const pushModal = async (options: ModalOptions, fromToken: string, toToken?: string) => {
  // html
  const html = createModal(options);
  // 推送
  const res = await pushMessage({
    title: '消息提示',
    content: html,
    fromToken,
    toToken,
    template: 'html',
  });
  return res;
};

/**
 * @description 格式化日期时间数字
 * @param num
 * @returns
 */
const formatDateNum = (num: number) => {
  return num < 10 ? `0${num}` : `${num}`;
};

/**
 * @description 格式化日期时间
 * @param time
 * @returns
 * @example
 * formatDateTime() -> "2022-09-01 08:00:00"
 * formatDateTime(new Date()) -> "2022-09-01 08:00:00"
 * formatDateTime(Date.now()) -> "2022-09-01 08:00:00"
 */
export const formatDateTime = (time: Date | string | number = Date.now()) => {
  const date = new Date(time);
  const s = date.getSeconds();
  const min = date.getMinutes();
  const h = date.getHours();
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  // 日期
  const dateText = [y, m, d].map(formatDateNum).join('-');
  // 时间
  const timeText = [h, min, s].map(formatDateNum).join(':');
  // 日期时间
  const dateTimeText = `${dateText} ${timeText}`;
  return dateTimeText;
};

/**
 * @description 格式化时间日期
 * @param time
 * @returns
 * @example
 * @example
 * formatDate() -> "2022-09-01"
 * formatDate(new Date()) -> "2022-09-01"
 * formatDate(Date.now()) -> "2022-09-01"
 */
export const formatDate = (time: Date | string | number = Date.now()) => {
  const date = new Date(time);
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  // 日期
  const dateText = [y, m, d].map(formatDateNum).join('-');
  return dateText;
};

/**
 * @description 格式化时间
 * @param time
 * @returns
 * @example
 * formatTime() -> "08:00:00"
 * formatTime(new Date()) -> "08:00:00"
 * formatTime(Date.now()) -> "08:00:00"
 */
export const formatTime = (time: Date | string | number = Date.now()) => {
  const date = new Date(time);
  const s = date.getSeconds();
  const min = date.getMinutes();
  const h = date.getHours();
  // 时间
  const timeText = [h, min, s].map(formatDateNum).join(':');
  return timeText;
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
export const getCookieIncludesDomain = async (page: pup.Page, domain: string) => {
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
    const cookie = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
    return cookie;
  }
  return '';
};

/**
 * @description 格式化任务
 * @param task
 * @returns
 */
export const formatTask = (task: { currentScore: number; dayMaxScore: number }) => {
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
 * @description 获取范围
 * @param page 页面
 * @param selector
 * @returns
 */
export const getBounds = async (page: pup.Page, selector: string): Promise<Bounds> => {
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
 * @description 创建随机点
 * @param bounds 范围
 * @returns
 */
export const createRandomPoint = (bounds: Bounds): Point => {
  // 范围
  const { x, y, width, height } = bounds;
  // 横坐标
  const randX = x + Math.random() * width * 0.5 + width * 0.25;
  // 纵坐标
  const randY = y + Math.random() * height * 0.5 + height * 0.25;
  return {
    x: randX,
    y: randY,
  };
};

/**
 * @description 生成随机路径
 * @param start
 * @param end
 * @param steps
 * @returns
 */
export const createRandomPath = (start: Point, end: Point, steps: number) => {
  // 最小水平增量
  const minDeltaX = (end.x - start.x) / steps;
  // 最大垂直增量
  const maxDeltaY = (end.y - start.y) / steps;

  const path: Point[] = [];
  // 开始节点
  path.push(start);
  // 插入点
  for (let i = 0; i < steps; i++) {
    // 横坐标
    const x = path[i].x + Math.random() * 5 + minDeltaX;
    // 纵坐标
    const y = path[i].y + Math.random() * 5 * Math.pow(-1, ~~(Math.random() * 2 + 1)) + maxDeltaY;
    path.push({
      x,
      y,
    });
  }
  return path;
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
          for (let i = 0; i < 5; i++) box.classList.toggle('button-' + i, !!(buttons & (1 << i)));
        };
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener(
          'mousemove',
          (event) => {
            box.style.left = event.pageX + 'px';
            box.style.top = event.pageY + 'px';
            updateButtons(event.buttons);
          },
          true
        );
        document.addEventListener(
          'mousedown',
          (event) => {
            updateButtons(event.buttons);
            box.classList.add('button-' + event.which);
          },
          true
        );
        document.addEventListener(
          'mouseup',
          (event) => {
            updateButtons(event.buttons);
            box.classList.remove('button-' + event.which);
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
 * @description html进度条
 * @param title
 * @param percent
 * @returns
 */
export const getProgressHTML = (title: string, percent: number) => {
  // html
  const progressHTML = `<div
    style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1px 0;
    "
  >
    <span>${title}</span>
    <span>${getHighlightHTML(percent)} %</span>
  </div>
  <div
    style="
      background: white;
      border-radius: 10px;
      height: 10px;
      border: 1px solid #eee;
      flex-shrink: 1;
    "
  >
    <div
      style="
        background: linear-gradient(to left, #188fff80, #1890ff);
        height: 100%;
        width: ${percent}%;
        border-radius: 10px;
      "
    ></div>
  </div>`;
  return progressHTML;
};
/**
 * @description html高亮文本
 * @param text
 * @returns
 */
export const getHighlightHTML = (text: string | number) => {
  // html
  const highlightHTML = `<span style="color: #1890ff">${text}</span>`;
  return highlightHTML;
};
/**
 * @description 获取剩余任务
 * @returns
 */
export const getRestScheduleList = (
  scheduleList: (Schedule & {
    timeText: string;
    time: number;
    cron: string;
    nextDate: Date;
  })[]
) => {
  // 剩余任务
  const rest = scheduleList
    .map((schedule) => {
      // 任务时间
      const time = paser.parseExpression(schedule.cron);
      // 当前时间
      const date = new Date();
      // 当前任务是否结束
      const done = !time.hasNext();
      // 下个任务是否在今天
      const isToday = !done && formatDate(schedule.nextDate) === formatDate(date);
      return {
        ...schedule,
        isToday,
        done,
      };
    })
    .filter((sendInfo) => sendInfo.isToday)
    .sort((a, b) => a.time - b.time);
  return rest;
};

/**
 * 生成刷新任务列表，生成当前时间到下次学习任务区间的刷新任务
 * @param options
 * @returns
 */
export const generateRefreshCookieJobs = (options: {
  endTime: Date;
  intervalRange: [number, number];
  cookieId: string;
}) => {
  const { endTime, intervalRange, cookieId } = options;
  const now = Date.now();
  const oneMinute = 1000 * 60;

  let intervalTime =
    (Math.random() * (intervalRange[1] - intervalRange[0]) + intervalRange[0]) * oneMinute;
  let currentJobTime = endTime.getTime() - intervalTime;

  const jobs: RefreshCookieJob[] = [];
  while (currentJobTime >= now) {
    jobs.push({
      time: currentJobTime,
      type: 'freshCookie',
      effective: true,
      params: { cookieId },
    });

    intervalTime =
      (Math.random() * (intervalRange[1] - intervalRange[0]) + intervalRange[0]) * oneMinute;
    currentJobTime = currentJobTime - intervalTime;
  }

  return jobs;
};

/**
 * @description 格式化任务列表
 * @param scheduleList
 * @returns
 */
export const generateStudyJobParams = (scheduleList: Schedule[]) => {
  // 格式化任务
  const studyJobsParams: StudyJobParams[] = [];

  scheduleList.forEach((schedule) => {
    const cronList = Array.isArray(schedule.cron) ? schedule.cron : [schedule.cron];
    cronList.forEach((cron) => {
      // 任务时间
      const time = paser.parseExpression(cron);
      // 下次任务时间
      const nextDate = time.next().toDate();
      // 时间文本
      const timeText = formatTime(nextDate);

      studyJobsParams.push({
        ...schedule,
        timeText,
        cron,
        time: nextDate.getTime(),
        nextDate,
      });
    });
  });

  studyJobsParams.sort((a, b) => a.time - b.time);

  return studyJobsParams;
};

/**
 * @description 创建表格
 * @param theadData
 * @param tbodyData
 * @returns
 */
export const getTableHTML = (theadData: string[], tbodyData: string[][]) => {
  // 表头
  const thead = theadData
    .map(
      (head) => `<th
  style="
    padding: 12px;
    border-bottom: solid #efeff5 1px;
    border-right: solid #efeff5 1px;
  "
>
  ${head}
</th>`
    )
    .join('');
  // 表身
  const tbody = tbodyData
    .map(
      (body) => `<tr>
${body
  .map(
    (b) => `<td
style="
  padding: 12px;
  border-bottom: solid #efeff5 1px;
  border-right: solid #efeff5 1px;
"
>
${b}
</td>`
  )
  .join('')}
</tr>`
    )
    .join('');
  // 表
  const table = `<table
  class="n-table n-table--bottom-bordered"
  style="
    background: #fff;
    color: #333639;
    font-size: 14px;
    border-collapse: separate;
    border-spacing: 0;
    outline: none;
    box-sizing: border-box;
    width: 100%;
    border-top: solid #efeff5 1px;
    border-left: solid #efeff5 1px;
  "
>
  <thead>
    <tr style="background: #fafafc; font-weight: 500; color: #1f2225">
      ${thead}
    </tr>
  </thead>
  <tbody>
    ${tbody}
  </tbody>
</table>`;
  return table;
};
