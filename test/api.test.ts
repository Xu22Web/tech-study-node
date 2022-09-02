import { describe, expect, it } from 'vitest';
import pup from 'puppeteer-core';
import PUP_CONFIG from '../src/config/pup';
import shared from '../src/shared';
import { getAnswerSearch1, getAnswerSearch2 } from '../src/controller/exam';
import { getVideos, getNews } from '../src/controller/watch';
import {
  getTodayScore,
  getTotalScore,
  getUserInfo,
  getTaskList,
} from '../src/controller/user';
import handleLogin from '../src/controller/login';
import PUSH_CONFIG from '../src/config/push';

describe('api', () => {
  it.skip('new', async () => {
    // 获取视频
    const res = await getNews();
    expect(res.slice(0, 1)).toMatchInlineSnapshot(`
      [
        {
          "auditTime": "2022-08-30 21:41:38",
          "author": "",
          "channelIds": [
            "1crqb964p71",
            "19vhj0omh73",
          ],
          "channelNames": [
            "头条新闻",
            "重要会议",
          ],
          "crossTime": 0,
          "dataValid": true,
          "editor": "[\\"任晓旭\\"]",
          "itemId": "2070234978393374750",
          "itemType": "kNews",
          "nameB": "",
          "producer": "采编系统",
          "publishTime": "2022-08-30 18:51:25",
          "showSource": "“学习强国”学习平台",
          "source": "yres-article-manual_“学习强国”学习平台",
          "thumbImage": "",
          "title": "中共中央政治局会议建议：党的二十大10月16日在北京召开",
          "type": "tuwen",
          "url": "https://www.xuexi.cn/lgpage/detail/index.html?id=2070234978393374750&item_id=2070234978393374750",
        },
      ]
    `);
  });
  it.skip('video', async () => {
    // 获取视频
    const res = await getVideos();
    expect(res.slice(0, 1)).toMatchInlineSnapshot(`
      [
        {
          "auditTime": "2022-08-26 16:19:07",
          "author": "",
          "channelIds": [
            "5cvsvci7vk44",
          ],
          "channelNames": [
            "党史百年",
          ],
          "crossTime": 0,
          "dataValid": true,
          "editor": "[\\"汪欣蕊\\"]",
          "itemId": "12119298391418672750",
          "itemType": "kPureVideo",
          "nameB": "",
          "producer": "采编系统",
          "publishTime": "2022-08-26 14:58:27",
          "showSource": "中共阜阳市委宣传部通讯站",
          "source": "video-platform-operation_中共阜阳市委宣传部通讯站",
          "thumbImage": "https://boot-img.xuexi.cn/image/1005/process/f827ee50d47f4dcc8de876a5242c5066.jpg",
          "title": "伟大的奋斗 从一大到二十大｜第三十一集：筹划如何建设社会主义的历史盛会",
          "type": "shipin",
          "url": "https://www.xuexi.cn/lgpage/detail/index.html?id=12119298391418672750&item_id=12119298391418672750",
        },
      ]
    `);
  });
  it.skip('score', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await getTodayScore();
    expect(res).toMatchInlineSnapshot('14');
  });
  it.skip('total', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await getTotalScore();
    expect(res).toMatchInlineSnapshot('15889');
  });
  it.skip('userInfo', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await getUserInfo();
    expect(res).toMatchInlineSnapshot(`
      {
        "avatarMediaUrl": null,
        "gmtActive": xxx,
        "nick": "xxx",
        "orgIds": [
          xxx,
          xxx,
        ],
        "uid": xxx,
      }
    `);
  });
  it.skip('taskList', async () => {
    const broswer = await pup.launch(PUP_CONFIG);
    shared.setBrowser(broswer);
    await shared.openPage();
    // 登录
    await handleLogin();
    const res = await getTaskList();
    expect(res).toMatchInlineSnapshot(`
      [
        {
          "currentScore": 6,
          "dayMaxScore": 12,
          "need": 6,
          "rate": 50,
          "status": false,
        },
        {
          "currentScore": 7,
          "dayMaxScore": 12,
          "need": 5,
          "rate": 58.33,
          "status": false,
        },
        {
          "currentScore": 0,
          "dayMaxScore": 5,
          "need": 5,
          "rate": 0,
          "status": false,
        },
        {
          "currentScore": 0,
          "dayMaxScore": 5,
          "need": 5,
          "rate": 0,
          "status": false,
        },
        {
          "currentScore": 0,
          "dayMaxScore": 1,
          "need": 1,
          "rate": 0,
          "status": false,
        },
      ]
    `);
  });
  it.skip('answer1', async () => {
    const res = await getAnswerSearch1('b0f6c22ae12f43c1107a9ca604fcc10d');
    expect(res).toMatchInlineSnapshot(`
      [
        "选举诉讼",
      ]
    `);
  });
  it.skip('answer2', async () => {
    const res = await getAnswerSearch2('2006年5月20日，经国');
    expect(res).toMatchInlineSnapshot('[]');
  });
  it.skip('sharedpush', async () => {
    shared.setToken(PUSH_CONFIG.list[0].token)
    const res = await shared.pushModal({
      title: '普通提示',
      content: ['发生错误!', String(1)],
      type: 'fail',
      to: '管理员',
    });
    expect(res).toMatchInlineSnapshot('undefined');
  });
  it('sharedpushtips', async () => {
    const res = await shared.pushModalTips({
      title: '服务提示',
      content: ['发生错误!', String(1)],
      type: 'fail',
    });
    expect(res).toMatchInlineSnapshot('undefined');
  });
});
