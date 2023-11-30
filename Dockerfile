FROM node:16-bullseye-slim

ENV DEBIAN_FRONTEND noninteractive
ENV TZ Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 配置环境变量，跳过 npm 安装时候的 chromium 的下载
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# 指定浏览器的路径
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 替换几个镜像源，以及安装 pm2，如果你不想使用 pm2 来运行，可以删掉
RUN sed -i 's#http://deb.debian.org#http://mirrors.aliyun.com#g;s#http://security.debian.org#http://mirrors.aliyun.com#g' /etc/apt/sources.list \
    && npm c set registry="https://registry.npmmirror.com" \
    && echo "puppeteer_download_host=https://registry.npmmirror.com/-/binary" >> ~/.npmrc \
    && npm install pm2 -g

# 安装必要的库
RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y wget gnupg \
        fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
        libgtk2.0-0 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2 && \
    apt-get install -y chromium && \
    apt-get clean

# debug 用
# RUN apt-get update \
#     && apt-get -y install procps \
#     && apt-get install -y vim

WORKDIR /data/srv/

COPY . ./

RUN npm install && npm run build

CMD ["pm2-runtime", "ecosystem.config.js"]
