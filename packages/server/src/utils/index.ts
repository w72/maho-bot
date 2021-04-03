import { sum, random, range } from 'lodash';
import { Asset } from 'service/assets';

export async function ensureImage(
  image: Promise<Buffer | string | Asset> | Buffer | Asset | string
): Promise<Buffer | string> {
  if (image instanceof Promise) image = await image;
  if (image instanceof Asset) image = await image.base64();
  return image;
}

export function randomWeighted<T>(data: T[], weight: number[]): T {
  const total = sum(weight);
  const rand = random(total, true);
  for (const i of range(data.length))
    if (rand <= sum(weight.slice(0, i + 1))) return data[i];
  return data[0];
}
