import sharp from 'sharp';
import path from 'path';
import { loadImage, createCanvas } from 'canvas';

import assets, { Asset } from 'service/assets';
import App from 'service/app';

const app = new App({ name: '่กจๆ็ๆ' });

async function drawMeme(asset: Asset, text: string) {
  const lineNum = Math.ceil(text.length / 8);
  const lineLen = Math.ceil(text.length / lineNum);
  const lines = text.match(new RegExp(`(.{1,${lineLen}})`, 'g'))!;
  const fontSize = text.length > 6 ? 18 : 24;
  const lineHeight = fontSize + 4;
  const textHeight = lineHeight * lineNum;
  const img = await loadImage(await asset.buffer());
  const canvas = createCanvas(img.naturalWidth, img.naturalHeight + textHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  ctx.font = `${fontSize}px pcr, msyh`;
  ctx.fillStyle = '#3c404c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const x = img.naturalWidth / 2;
  const y = img.naturalHeight + lineHeight;
  for (const [i, line] of lines.entries()) {
    ctx.fillText(line, x, y + i * lineHeight);
  }
  return canvas.toBuffer('image/png');
}

async function drawList() {
  const imgList = await app.assets().glob('*.png');
  const canvas = createCanvas(
    imgList.length < 5 ? imgList.length * 160 : 5 * 160,
    Math.ceil(imgList.length / 5) * 160
  );
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [i, imgPath] of imgList.entries()) {
    const img = await loadImage(await assets.path(imgPath).buffer());
    const x = (i % 5) * 160;
    const y = Math.floor(i / 5) * 160;
    const name = path.basename(imgPath).slice(0, -4);
    const fontSize = name.length > 4 ? (name.length > 6 ? 20 : 24) : 32;
    ctx.font = `${fontSize}px pcr, msyh`;
    ctx.fillStyle = '#3c404c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.drawImage(img, x + (160 - img.naturalWidth) / 2, y);
    ctx.strokeText(name, x + 80, y + 155);
    ctx.fillText(name, x + 80, y + 155);
  }
  return canvas.toBuffer('image/jpeg');
}

app.on('message', {
  filter: { pattern: /^ไธไผ?่กจๆ\s+([^\s+]+)\s*$/, image: true },
  handler: async (e: any) => {
    const name = e.$match[1];
    if (name.length > 7) {
      await e.$replyText(`่กจๆๅ็งฐ่ฟ้ฟ`);
      return;
    }
    const imgRaw = await assets.remote(e.$image.url).buffer();
    const img = await sharp(imgRaw)
      .resize(160, 160, { fit: 'inside' })
      .png()
      .toBuffer();
    await app.assets(`${name}.png`).save(img);
    await e.$replyText(`ไธไผ?่กจๆโ${name}โๆๅ`);
  },
});

app.on('message', {
  filter: { pattern: /^็ๆ่กจๆ\s+([^\s+]+)\s+(.+?)\s*$/ },
  handler: async (e: any) => {
    const name = e.$match[1];
    const text = e.$match[2];
    const imgAsset = app.assets(`${name}.png`);
    if (await imgAsset.exists()) {
      await e.$replyImage(drawMeme(imgAsset, text), { at_sender: false });
    } else {
      await e.$replyText(`ๆชๆพๅฐๅไธบโ${name}โ็่กจๆ`);
    }
  },
});

app.on('message', {
  filter: { pattern: /^ๆฅ็่กจๆ$/ },
  handler: (e: any) => e.$replyImage(drawList()),
});

app.on('message', {
  filter: { pattern: /^ๆฅ็่กจๆ\s+([^\s+]+)$/ },
  handler: async (e: any) => {
    const name = e.$match[1];
    const img = app.assets(`${name}.png`);
    if (await img.exists()) {
      await e.$replyImage(img, { at_sender: false });
    } else {
      await e.$replyText(`ๆชๆพๅฐๅไธบโ${name}โ็่กจๆ`);
    }
  },
});

app.on('message', {
  filter: { pattern: /^ๅ?้ค่กจๆ\s+([^\s+]+)$/ },
  handler: async (e: any) => {
    const name = e.$match[1];
    const img = app.assets(`${name}.png`);
    if (await img.exists()) {
      await img.delete();
      await e.$replyText(`ๅ?้ค่กจๆโ${name}โๆๅ`);
    } else {
      await e.$replyText(`ๆชๆพๅฐๅไธบโ${name}โ็่กจๆ`);
    }
  },
});

app.test = async function () {
  assets
    .test('test-meme.png')
    .save(await drawMeme(app.assets('ๅฐไปๅฏ.png'), 'ๆๆฅไบๆๆฅไบๆ'));
  assets.test('test-meme-list.png').save(await drawList());
};

export default app;
