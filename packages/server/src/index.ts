import 'reflect-metadata';
import path from 'path';
import schedule from 'node-schedule';
import { registerFont } from 'canvas';

import * as onebot from 'service/onebot';
import assets from 'service/assets';
import log from 'service/log';
import config from 'service/config';

const apps: any[] = [];

registerFont(assets.font('msyh.ttc').path, { family: 'msyh' });
registerFont(assets.font('TTQinYuanJ-W3.ttf').path, { family: 'pcr' });

const r = require.context('./app', true, /index\.ts$/);

for (const file of r.keys()) {
  const { default: app } = r(file);
  app.id = path.basename(path.dirname(file));
  app.config = config.apps[app.id];
  apps.push(app);
  log.info(`load app ${app.id}`);
}

for (const app of apps) await app.init();

if (config.dev)
  for (const app of apps) if (config.tests.includes(app.id)) await app.test();

for (const app of apps)
  for (const event of app.events) onebot.listen(app.id, event);

for (const app of apps)
  for (const cron of app.crons)
    schedule.scheduleJob(cron.schedule, cron.handler);

if (!config.dev) {
  process.on('uncaughtException', (err) => {
    log.error(err);
  });
}

declare const module: any;

if (module.hot) {
  module.hot.accept();
}
