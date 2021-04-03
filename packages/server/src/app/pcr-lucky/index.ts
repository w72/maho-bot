import { sample, random } from 'lodash';
import { registerFont, loadImage, createCanvas } from 'canvas';

import App from 'service/app';
import assets from 'service/assets';

const app = new App({ name: 'PCR抽签' });

async function draw() {
  const {
    luckType,
    bases: basesPcr,
    luckDesc: luckDescPcr,
    basesGenshin,
    luckDescGenshin,
  } = app.state;
  const [bases, luckDesc] = random(1)
    ? [basesPcr, luckDescPcr]
    : [basesGenshin, luckDescGenshin];
  const assetBase = assets.path(sample(bases));
  const charId = assetBase.name.slice(6, -4);
  const char = luckDesc.find((v: any) => v.charaid.includes(charId))!;
  const charType = sample(char.type)!;
  const luck = luckType.find(
    (v: any) => v['good-luck'] === charType['good-luck']
  )!;
  const { name: title } = luck;
  let { content: text } = charType;
  if (text.length > 9 && text.length < 9 * 2) {
    const diff = 9 * 2 - text.length;
    const middle = Math.ceil(text.length / 2);
    text = text.slice(0, middle) + ' '.repeat(diff) + text.slice(middle);
  }
  const lines: string[] = text.match(/(.{1,9})/g)!;

  const canvas = createCanvas(480, 480);
  const ctx = canvas.getContext('2d');

  const imgBase = await loadImage(assetBase.path);
  ctx.drawImage(imgBase, 0, 0);

  ctx.save();
  ctx.font = '45px mamelon';
  ctx.fillStyle = '#F5F5F5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 140, 99);
  ctx.restore();

  ctx.save();
  ctx.font = '25px sakura';
  ctx.fillStyle = '#323232';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const [i, line] of lines.entries()) {
    const lineX = 125 + 15 * lines.length - i * 30;
    for (const [j, letter] of Array.from(line).entries()) {
      ctx.fillText(letter, lineX, 200 + ((9 - line.length) / 2) * 28 + 28 * j);
    }
  }
  ctx.restore();

  return canvas.toBuffer('image/jpeg');
}

app.init = async () => {
  registerFont(app.assets('font/Mamelon.otf').path, { family: 'mamelon' });
  registerFont(app.assets('font/sakura.ttf').path, { family: 'sakura' });
  app.state.luckType = await app.assets('data/luck_type.json').json();
  app.state.luckDesc = await app.assets('data/luck_desc.json').json();
  app.state.luckDescGenshin = await app
    .assets('data/luck_desc_genshin.json')
    .json();
  app.state.bases = await app.assets('imgbase').glob();
  app.state.basesGenshin = await app.assets('imgbase-genshin').glob();
};

app.on('message.group', {
  filter: { at: true, pattern: /^抽签$/ },
  handler: async (e: any) => e.$replyImage(draw(), { at_sender: false }),
});

app.test = async () => {
  await assets.test('test-lucky.jpg').save(await draw());
};

export default app;
