import sharp from 'sharp';

import App from 'service/app';
import log from 'service/log';
import assets from 'service/assets';
import config from 'service/config';

const app = new App({
  name: '涩图',
  description: '来一发瑟图！',
});

app.on('message.group', {
  filter: {
    pattern: /^来一?[点份张](.{0,6}?)的?[色涩瑟]图$|^[色涩瑟]图$|^[色涩瑟]图\s+(.{0,6}?)$/,
  },
  help: [
    {
      message: '来点涩图/涩图',
      reply: '随机涩图',
      memo:
        '^来一?[点份张](.{0,6}?)的?[色涩瑟]图$|^[色涩瑟]图$|^[色涩瑟]图\\s+(.{0,6}?)$',
    },
    {
      message: '涩图 优衣/来点优衣涩图',
      reply: '搜索优衣的涩图',
      memo: '搜索字符串最长为6，超出长度则不会响应这条消息',
    },
  ],
  handler: async (e: any) => {
    const keyword = e.$match[1] || e.$match[2] || '';
    const { names } = config;
    const { apikey, r18, maxWidth, maxHeight, quality } = app.config;
    const url = 'https://api.lolicon.app/setu/';
    const params = new URLSearchParams({ apikey, keyword, r18 });
    const res = await assets.remote(`${url}?${params}`).json();
    if (res.code === 0) {
      const { url, title, author, pid } = res.data[0];
      log.info('downloading %s', url);
      try {
        const imgRaw = await assets.remote(url).buffer();
        const img = await sharp(imgRaw)
          .resize(maxWidth, maxHeight, { fit: 'inside' })
          .jpeg({ quality })
          .toBuffer();
        const description = `${title}\n画师：${author}\npid：${pid}`;
        await e.$replyTextImage(description, img);
      } catch {
        await e.$replyText(`涩图下载失败`);
      }
    } else if (keyword && res.code === 404) {
      await e.$replyText(
        `没有找到“${keyword}”的涩图，试试输入“来点${names[0]}涩图”吧！`
      );
    } else {
      await e.$replyText(`涩图获取失败：${res.msg}`);
    }
  },
});

export default app;
