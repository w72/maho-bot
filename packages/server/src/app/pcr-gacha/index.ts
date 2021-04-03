import { loadImage } from 'canvas';

import { api } from 'service/onebot';
import assets from 'service/assets';

import app from './app';
import { gacha10, gacha300, get1, get10, get300 } from './gacha';

const verUrl = 'https://api.redive.lolikon.icu/gacha/gacha_ver.json';
const poolUrl = 'https://api.redive.lolikon.icu/gacha/default_gacha.json';
const pcrDataUrl = 'https://api.redive.lolikon.icu/gacha/unitdata.py';

async function load() {
  app.state.ver = (await assets.pcrData('ver.json').json()).ver;
  app.state.names = await assets.pcrData('name.json').json();
  app.state.pools = await assets.pcrData('pool.json').json();
  app.state.pool = app.state.pools[app.config.pool];
}

async function update(force = false) {
  const remote = await assets.remote(verUrl).json();
  const local = await assets.pcrData('ver.json').json();
  if (!force && remote.ver === local.ver) return false;
  await assets.pcrData('ver.json').saveJson(remote);
  await assets.pcrData('pool.json').fetchText(poolUrl);
  const obj: any = await assets.remote(pcrDataUrl).js();
  await assets.pcrData('name.json').saveJson(obj.CHARA_NAME);
  await load();
  return remote.ver;
}

app.init = async () => {
  await assets.pcrData('ver.json').fetchTextIfNotExists(verUrl);
  await assets.pcrData('pool.json').fetchTextIfNotExists(poolUrl);
  const pcrDataFile = assets.pcrData('name.json');
  if (await pcrDataFile.notExists()) {
    const obj: any = await assets.remote(pcrDataUrl).js();
    await pcrDataFile.saveJson(obj.CHARA_NAME);
  }
  await load();

  const img = (name: string) => loadImage(app.assets(name).path);
  app.state.imgBackground = await img('background.png');
  app.state.imgAlert = await img('alert.png');
  app.state.imgBorder = await img('border.png');
  app.state.imgColor = await img('color.png');
  app.state.imgBlink = await img('blink.png');
  app.state.imgNew = await img('new.png');
  app.state.imgStar = await img('star.png');
  app.state.imgStarBg = await img('star-background.png');
  app.state.imgDialog = await img('dialog.png');
};

app.on('message.group', {
  filter: { at: true, pattern: /^单抽$/ },
  handler: (e: any) => e.$replyImage(gacha10([get1()]), { at_sender: false }),
});

app.on('message.group', {
  filter: { at: true, pattern: /^十连$/ },
  handler: (e: any) => e.$replyImage(gacha10(get10()), { at_sender: false }),
});

app.on('message.group', {
  filter: { at: true, pattern: /^[抽来]一井$/ },
  handler: async (e: any) => {
    const { group_id, user_id } = e;
    const { card, nickname } = await api.get_group_member_info({
      group_id,
      user_id,
    });
    await e.$replyImage(gacha300(get300(), { name: card || nickname }), {
      at_sender: false,
    });
  },
});

app.on('message.group', {
  filter: { admin: true, pattern: /^更新卡池$/ },
  handler: async (e: any) => {
    const ver = await update();
    if (ver) {
      await e.$replyText(`更新卡池成功，当前版本${ver}`);
    } else {
      await e.$replyText(`无需更新卡池，当前版本${app.state.ver}`);
    }
  },
});

app.on('message.group', {
  filter: { admin: true, pattern: /^强制更新卡池$/ },
  handler: async (e: any) => {
    const ver = await update(true);
    await e.$replyText(`更新卡池成功，当前版本${ver}`);
  },
});

app.cron('10 17 * * *', { name: '自动更新卡池', handler: () => update() });

app.test = async () => {
  assets.test('test-gacha10.jpg').save(await gacha10(get10()));
  assets
    .test('test-gacha300.jpg')
    .save(await gacha300(get300(), { name: '测试' }));
};

export default app;
