import * as pup from 'puppeteer-core';
import { describe, expect, it } from 'vitest';
import PUP_CONFIG from '../src/config/pup';
import { SCHEDULE_CONFIG } from '../src/config/schedule';
import { getAnswerSearch } from '../src/controller/exam';
import handleLogin from '../src/controller/login';
import {
  getTaskList,
  getTodayScore,
  getTotalScore,
  getUserInfo,
} from '../src/controller/user';
import { getNews, getVideos } from '../src/controller/watch';
import shared from '../src/shared';

describe('api', () => {
  it.skip('news', async () => {
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
          "currentScore": 12,
          "dayMaxScore": 12,
          "rate": 100,
          "status": true,
          "title": "文章选读",
          "type": 0,
        },
        {
          "currentScore": 12,
          "dayMaxScore": 12,
          "rate": 100,
          "status": true,
          "title": "视听学习",
          "type": 1,
        },
        {
          "currentScore": 5,
          "dayMaxScore": 5,
          "rate": 100,
          "status": true,
          "title": "每日答题",
          "type": 2,
        },
        {
          "currentScore": 10,
          "dayMaxScore": 1,
          "rate": 100,
          "status": true,
          "title": "专项练习",
          "type": 3,
        },
      ]
    `);
  });
  it.skip('answer', async () => {
    const res = await getAnswerSearch(
      '新时期要注重选拔任用（）、（）、（）、（）、（）的干部，对政治不合格的干部实行“一票否决”，已经在领导岗位的坚决调整。'
    );
    expect(res).toMatchInlineSnapshot(`
      [
        "牢固树立“四个意识”",
        "自觉坚定“四个自信”",
        "坚决做到“两个维护”",
        "全面贯彻执行党的理论",
        "忠诚干净担当",
      ]
    `);
  });
  it.skip('sharedpush', async () => {
    shared.setPushOptions(SCHEDULE_CONFIG[0]);
    const res = await shared.pushModal({
      title: '普通提示',
      content: ['发生错误!', '测试'],
      type: 'fail',
    });
    expect(res).toMatchInlineSnapshot('undefined');
  });
  it.skip('sharedpushtips', async () => {
    const res = await shared.pushModalTips({
      title: '服务提示',
      content: ['发生错误!', '测试'],
      type: 'fail',
    });
    expect(res).toMatchInlineSnapshot('undefined');
  });
});
