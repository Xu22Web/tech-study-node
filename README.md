# tech-study-node

### 描述 Description

- 基于 `Node.js` 的自动化学习强国工具

- 依赖 `puppeteer` / `puppeteer-core` 实现浏览器控制

- 依赖 `node-schedule` 实现定时任务

- 依赖 `vitest` 完成基础功能的单元测试

- 通过学习强国`PC 网页版`完成学习任务

- 如果感觉配置麻烦，去看看 [油猴插件脚本版](https://github.com/Xu22Web/tech-study-js '油猴插件脚本版') `https://github.com/Xu22Web/tech-study-js`

### 优点 Advantages

- 学习强国 `PC 网页版` 学习任务的完美解决方案

- 基于 `puppeteer` / `puppeteer-core` 的 API 操作浏览器，实现登录二维码捕获、DOM 元素操作以及处理滑动验证的功能

- 基于 `PushPlus` 推送功能，通过微信远程接收学习情况和服务运行情况

- 基于 `node-schedule` 设定定时任务，支持对好友推送学习强国登录

### 安装与运行 Install and Run

1. 安装依赖

```
pnpm install
```

2. （ `Windows` 跳过）在 `Linux` 上安装 Puppeteer 依赖（[官方 GitHub 说明](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#chrome-headless-doesnt-launch-on-unix 'Linux 的 Puppeteer 依赖')）

> 确保安装了所有必要的依赖项。你可以在 Linux 上运行 `ldd chrome | grep not` 来检查缺少哪些依赖项。下面提供常见必要的依赖项：

<details>
<summary>Debian (e.g. Ubuntu) Dependencies</summary>

```
 apt install \
 gconf-service \
 libasound2 \
 libatk1.0-0 \
 libc6 \
 libcairo2 \
 libcups2 \
 libdbus-1-3 \
 libexpat1 \
 libfontconfig1 \
 libgcc1 \
 libgconf-2-4 \
 libgdk-pixbuf2.0-0 \
 libglib2.0-0 \
 libgtk-3-0 \
 libnspr4 \
 libpango-1.0-0 \
 libpangocairo-1.0-0 \
 libstdc++6 \
 libx11-6 \
 libx11-xcb1 \
 libxcb1 \
 libxcomposite1 \
 libxcursor1 \
 libxdamage1 \
 libxext6 \
 libxfixes3 \
 libxi6 \
 libxrandr2 \
 libxrender1 \
 libxss1 \
 libxtst6 \
 ca-certificates \
 fonts-liberation \
 libappindicator1 \
 libnss3 \
 lsb-release \
 xdg-utils \
 wget
```

</details>

<details>
<summary>CentOS Dependencies</summary>
   
  ```bash
   yum install -y \
   alsa-lib.x86_64 \
   atk.x86_64 \
   cups-libs.x86_64 \
   gtk3.x86_64 \
   ipa-gothic-fonts \
   libXcomposite.x86_64 \
   libXcursor.x86_64 \
   libXdamage.x86_64 \
   libXext.x86_64 \
   libXi.x86_64 \
   libXrandr.x86_64 \
   libXScrnSaver.x86_64 \
   libXtst.x86_64 \
   pango.x86_64 \
   xorg-x11-fonts-100dpi \
   xorg-x11-fonts-75dpi \
   xorg-x11-fonts-cyrillic \
   xorg-x11-fonts-misc \
   xorg-x11-fonts-Type1 \
   xorg-x11-utils
  ```

</details>

3. 安装 `Google Chrome` 浏览器（注意：`Chromium` 无法使用，`视听学习` 的网页会打开错误），并配置 `executablePath`

<details>
<summary>CentOS</summary>

- 配置 yum 源

  - 在目录 `/etc/yum.repos.d/` 下新建文件 `google-chrome.repo`

    ```bash
     cd /etc/yum.repos.d/
     vim /ect/yum.repos.d/google-chrome.repo
    ```

  - 编辑文件 `google-chrome.repo` ，保存并退出

    ```
     [google-chrome]
     name=google-chrome
     baseurl=http://dl.google.com/linux/rpm/stable/$basearch
     enabled=1
     gpgcheck=1
     gpgkey=https://dl-ssl.google.com/linux/linux_signing_key.pub
    ```

- 安装 `Google Chrome` 浏览器

  - Google 官方源安装：

    ```bash
     yum -y install google-chrome-stable
    ```

  - Google 官方源可能在中国无法使用，需添加参数:

    ```bash
     yum -y install google-chrome-stable --nogpgcheck
    ```

- 测试运行 `Google Chrome` 浏览器

```bash
 google-chrome
 # 或
 google-chrome-stable
```

- 在 Puppeteer 配置中，将 `executablePath` 字段值改为 `google-chrome` 或 `google-chrome-stable`

</details>

<details>
<summary>Windows</summary>

- 下载安装 `Google Chrome` 浏览器

  - 官网安装：[Google Chrome 网络浏览器](https://www.google.cn/intl/zh-CN/chrome 'Google Chrome 网络浏览器')

- 准备可执行文件 `Google Chrome` 浏览器

  - 在项目根目录，新建文件夹 `.local_chromium`

    ```
     md .local_chromium
    ```

  - `Google Chrome` 安装根目录 `C:/Program Files/Google/Chrome/Application` （不 一定是这个路径，根据自身情况而定），安装根目录里的 `chrome.exe` 等文件（不含文件夹）、 文件夹 `1xx.0.xxx.xxx` 里的 `1xx.0.xxx.xxx.manifest` 等文件（不含文件夹）以及 `1xx. 0.xxx.xxx`里的`Locales` 文件夹（即标记 `✔` 的文件及文件夹），复制到 `.local_chromium`

    ```
     Application
      │  chrome.exe                          ✔
      │  chrome.VisualElementsManifest.xml   ✔
      │  chrome_proxy.exe                    ✔
      │  master_preferences                  ✔
      │
      └─1xx.0.xxx.xxx
         │  1xx.0.xxx.xxx.manifest           ✔
         │  1xx.0.xxx.xxx.manifest           ✔
         │  chrome.dll                       ✔
         │  chrome.dll.sig                   ✔
         │  chrome.exe.sig                   ✔
         │  chrome_100_percent.pak           ✔
         │  chrome_200_percent.pak           ✔
         │  chrome_elf.dll                   ✔
         │  chrome_pwa_launcher.exe          ✔
         │  d3dcompiler_47.dll               ✔
         │  elevation_service.exe            ✔
         │  eventlog_provider.dll            ✔
         │  icudtl.dat                       ✔
         │  libEGL.dll                       ✔
         │  libGLESv2.dll                    ✔
         │  mojo_core.dll                    ✔
         │  nacl_irt_x86_64.nexe             ✔
         │  notification_helper.exe          ✔
         │  optimization_guide_internal.dll  ✔
         │  resources.pak                    ✔
         │  v8_context_snapshot.bin          ✔
         │  vk_swiftshader.dll               ✔
         │  vk_swiftshader_icd.json          ✔
         │  vulkan-1.dll                     ✔
         │
         └─Locales                           ✔
    ```

- 在 Puppeteer 配置中，将 `executablePath` 字段值改为 `.local_chromium/chrome.exe`

</details>

4. 完善基础配置

   1. 查看更改 `Puppeteer 配置`，需要注意的配置项

      - `headless` 无头模式，即是否非图形界面显示

      - `executablePath` 可执行文件路径，由于项目采用 `Google Chrome` + `puppeteer-core` 的形式，需要手动下载浏览器并配置此项

   2. 查看更改 `Study 配置` ，需要注意的配置项

      - `qrcodeLocalEnabled` 登录二维码本地保存，便于在无头模式登录，开启推送后可以关闭

      - `weeklyReverse` 每周答题的顺序

      - `paperReverse` 专项练习的顺序

      - `weeklyExitAfterWrong` 每周答题，答题失败退出不提交

      - `paperExitAfterWrong` 专项练习，答题失败退出不提交

      - `settings` 配置需要进行的学习项目

   3. 查看更改 `Push 配置` ，是否启用 `PushPlus` 推送

      - 在 [PushPlus 官网](https://www.pushplus.plus/ 'PushPlus 官网') 上，注册登录账号，添加好友自己为好友，也可添加其他好友

      - 编辑 `PushPlus 配置` ，包含 `enabled` 、自己的 `token` 、好友消息的 `token` 以及定时任务的 `cron` 表达式等

      - 默认采用 `微信公众号` 推送，官方也支持第三方 `webhook` 服务（企业微信机器人、钉钉机器人、飞书机器人等）、企业微信应用、邮件等。

5. 运行

```
pnpm start
```

### 配置 Configuration

- Puppeteer 配置 `src/config/pup.ts` （[官方文档`puppeteer.launch`](http://www.puppeteerjs.com/#?product=Puppeteer&version=v16.2.0&show=api-puppeteerlaunchoptions 'Puppeteer 使用和配置')）

- Study 配置 `src/config/study.ts`

- PushPlus 配置 `src/config/push.ts`

- API 配置 `src/config/api.ts`

- URL 配置 `src/config/url.ts`

### 附加 Addition

- 在 `./test` 文件夹下，依赖 `vitest` 完成基础功能的单元测试

  - `login` 用户登录

  - `watch` 文章选读, 视听学习

  - `exam` 每日答题, 每周答题, 专项练习

  - `error` 错误测试 `gotoPage` 跳转超时等

  - `api` 测试 API 可用性

  - `log` 测试日志生成保存和自动删除
