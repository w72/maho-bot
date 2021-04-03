import sharp from 'sharp';
import { range, sample, random, countBy } from 'lodash';
import { loadImage, createCanvas } from 'canvas';
import type { CanvasRenderingContext2D, Image } from 'canvas';

import { randomWeighted } from 'utils';
import log from 'service/log';
import assets from 'service/assets';
import app from './app';

const img = (name: string) => loadImage(app.assets(name).path);
img.avatar = async (id: string) => {
  const avatar = assets.pcr(`icon/unit/${id}.png`);
  if (await avatar.notExists()) {
    log.info(`download icon/unit/${id}.png start`);
    const remoteIcon = assets.remote(
      `https://redive.estertion.win/icon/unit/${id}.webp`
    );
    if (await remoteIcon.exists()) {
      const imgRaw = await remoteIcon.buffer();
      await sharp(imgRaw).png().toFile(avatar.path);
      log.info(`download icon/unit/${id}.png succeed`);
    } else {
      log.error(`download icon/unit/${id}.png failed, remote icon not exists`);
    }
  }
  return await loadImage(avatar.path);
};

class NinePatch {
  width = 0;
  height = 0;
  top = 0;
  right = 0;
  bottom = 0;
  left = 0;

  constructor(public img: Image, public rect: any) {
    const [width, height, top, right, bottom, left] = rect;
    Object.assign(this, { width, height, top, right, bottom, left });
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, ox = 0, oy = 0) {
    const [w, h, t, r, b, l] = this.rect;
    const drawImage = (...args: any[]) => ctx.drawImage(this.img, ...args);

    drawImage(0, 0, l, t, ox, oy, l, t); // 左上
    drawImage(l + w, 0, r, t, l + w * x + ox, oy, r, t); // 右上
    drawImage(0, t + h, l, b, ox, t + h * y + oy, l, b); // 左下
    drawImage(l + w, t + h, r, b, l + w * x + ox, t + h * y + oy, r, b);
    range(y).forEach((i) => {
      drawImage(0, t, l, h, ox, t + h * i + oy, l, h); // 左
      drawImage(l + w, t, r, h, l + w * x + ox, t + h * i + oy, r, h);
    });
    range(x).forEach((i) => {
      drawImage(l, 0, w, t, l + w * i + ox, oy, w, t); // 上
      drawImage(l, t + h, w, b, l + w * i + ox, t + h * y + oy, w, b);
      range(y).forEach((j) => {
        drawImage(l, t, w, h, l + w * i + ox, t + h * j + oy, w, h);
      });
    });
  }
}

class Avatar {
  constructor(
    public ctx: CanvasRenderingContext2D,
    public position: { x: number; y: number },
    public size: number,
    public data: Character
  ) {}

  async draw() {
    const { imgBorder, imgColor, imgStar, imgStarBg } = app.state;

    const { ctx, size } = this;
    const { x, y } = this.position;
    const { star, avatar } = this.data;

    const starX = x + 6;
    const starY = y + size - 23;

    const imgAvatar = await img.avatar(avatar);

    ctx.drawImage(imgAvatar, 0, 0, 128, 128, x, y, size, size);
    ctx.drawImage(imgBorder, 0, 0, 128, 128, x, y, size, size);
    ctx.drawImage(imgStarBg, starX, starY);
    range(star)
      .reverse()
      .forEach((i) => ctx.drawImage(imgStar, starX + 13 * i, starY));

    if (star === 3) ctx.drawImage(imgColor, 0, 0, 104, 104, x, y, size, size);
  }

  drawNew() {
    const { imgNew } = app.state;
    const { x, y } = this.position;
    this.ctx.drawImage(imgNew, x - 12, y - 14);
  }

  drawBlink() {
    const { ctx, size } = this;
    const { star } = this.data;
    const { x, y } = this.position;
    const { imgBlink } = app.state;

    if (star === 1) return;

    range(star === 2 ? 8 : 36).map(() => {
      const [w, h] = randomWeighted(
        [
          [18, 22],
          [13, 16],
          [8, 10],
        ],
        [1, 2, star === 2 ? 0 : 3]
      );
      const rho = size * random(0.32, 0.64);
      const theta = (random(0, 359) * Math.PI) / 180;
      const randX = rho * Math.cos(theta);
      const randY = rho * Math.sin(theta);
      const X = x + size / 2 + randX - w / 2;
      const Y = y + size / 2 + randY - h / 2;
      ctx.drawImage(imgBlink, X, Y, w, h);
    });
  }

  drawText(text: string, x: number, y: number, textAlign = 'left') {
    const { ctx } = this;
    ctx.save();
    ctx.font = '16px pcr, msyh';
    ctx.fillStyle = '#3c404c';
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  drawInfo(number: string) {
    const { size } = this;
    const { name } = this.data;
    const { x, y } = this.position;
    const characterName = name.replace('（', '(').replace('）', ')');
    this.drawText(`${characterName}`, x + 4, y + 21);
    this.drawText(`${number}`, x + size - 6, y + size - 6, 'right');
  }
}

interface Character {
  id: number;
  star: number;
  name: string;
  avatar: string;
}

export function get1(isTenth = false): Character {
  const { pool, names } = app.state;
  const { up_prob, s3_prob, s2_prob } = pool;
  const type = isTenth
    ? randomWeighted(
        ['up', 'star3', 'star2'],
        [up_prob, s3_prob, 1000 - up_prob - s3_prob]
      )
    : randomWeighted(
        ['up', 'star3', 'star2', 'star1'],
        [up_prob, s3_prob, s2_prob, 1000 - up_prob - s3_prob - s2_prob]
      );
  const id = sample(pool[type]);
  const star = type === 'up' ? 3 : Number(type.slice(-1));
  const name = names[id][1] || names[id][0];
  const avatar = `${id}${star === 3 ? 3 : 1}1`;
  return { id, star, name, avatar };
}

export function get10(): Character[] {
  return range(10).map((v) => get1(v === 9 ? true : false));
}

export function get300(): Character[] {
  return range(30).flatMap(() => get10());
}

export async function gacha10(
  data: Character[] = [],
  start = 0
): Promise<Buffer> {
  const { imgBackground, imgAlert, pool } = app.state;

  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgBackground, 0, 0);

  const alert = false;

  for (let i = 0; i < data.length; i++) {
    const x = 190 + 136 * (i % 5);
    const y = 116 + 136 * Math.floor(i / 5);
    const avatar = new Avatar(ctx, { x, y }, 104, data[i]);
    await avatar.draw();
    avatar.drawBlink();
    if (pool.up.includes(data[i].id)) avatar.drawNew();
  }

  if (alert) ctx.drawImage(imgAlert, 278, 415);

  ctx.save();
  ctx.font = '16px pcr';
  ctx.fillStyle = '#3c404c';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${start}`, 704, 387);
  const gradient = ctx.createLinearGradient(0, 371, 0, 387);
  gradient.addColorStop(0, '#f5c050');
  gradient.addColorStop(1, '#d5711b');
  ctx.fillStyle = gradient;
  ctx.fillText(`${start + data.length}(+${data.length})`, 826, 387);
  ctx.restore();

  return canvas.toBuffer('image/jpeg');
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  ctx.save();
  ctx.font = '22px pcr, msyh';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#45658c';
  ctx.lineWidth = 4;
  ctx.textBaseline = 'bottom';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

export async function gacha300(
  data: Character[] = [],
  options: { name?: string } = {}
): Promise<Buffer> {
  const { name = '' } = options;
  const dataStar3 = data
    .map((v, i) => ({ ...v, index: i + 1 }))
    .filter((v) => v.star === 3);

  const { imgDialog } = app.state;

  const bg = new NinePatch(imgDialog, [26, 10, 40, 39, 54, 39]);
  const num = 4;
  const cell = 116;
  const cellPadding = 12;
  const contextX = num * cell - cellPadding;
  const padding = 12;
  const paddingTop = 80;
  const paddingBottom = 20;
  const paddingY = paddingTop + paddingBottom;
  const contextY = Math.ceil(dataStar3.length / num) * cell - cellPadding;
  const x = Math.ceil((contextX + padding * 2 - bg.left - bg.right) / bg.width);
  const y = Math.ceil((contextY + paddingY - bg.top - bg.bottom) / bg.height);
  const width = bg.left + bg.right + bg.width * x;
  const height = bg.top + bg.bottom + bg.height * y;
  const paddingLeft = (width - contextX) / 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  bg.draw(ctx, x, y);
  drawTitle(ctx, `${name}本次下井结果`, bg.left + (bg.width * x) / 2, 31);

  for (let i = 0; i < dataStar3.length; i++) {
    const { index } = dataStar3[i];
    const x = paddingLeft + cell * (i % num);
    const y = paddingTop + cell * Math.floor(i / num);
    const avatar = new Avatar(ctx, { x, y }, 104, dataStar3[i]);
    await avatar.draw();
    avatar.drawInfo(`№${index}`);
  }

  const { pool } = app.state;
  const starCounts = countBy(data, 'star');
  const soul = starCounts[1] + starCounts[2] * 10 + starCounts[3] * 50;

  const upIndex = data.findIndex((v) => pool.up.includes(v.id));

  ctx.save();
  ctx.font = '20px pcr';
  ctx.fillStyle = '#3c404c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    (upIndex === -1 ? `未获得UP角色` : `第 ${upIndex + 1} 抽获得UP角色`) +
      `，获得女神的秘石 ${soul} 个`,
    paddingLeft,
    70
  );
  ctx.restore();

  return canvas.toBuffer('image/jpeg');
}
