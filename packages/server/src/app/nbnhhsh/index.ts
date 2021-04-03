import fetch from 'node-fetch';
import App from 'service/app';

const app = new App({
  name: '能不能好好说话',
  description: '查询各种缩写',
});

app.on('message.group', {
  filter: { pattern: /^[?？] ?([a-z0-9]+)$/ },
  handler: async (e: any) => {
    const url = 'https://lab.magiconch.com/api/nbnhhsh/guess';
    const text = e.$match[1];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then((r) => r.json());
    const { name, trans } = res[0];
    await e.$replyText(`${name}: ${trans.join(' ')}`);
  },
});

export default app;
