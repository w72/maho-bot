import { noop } from 'lodash';

import assets from './assets';
import config, { GlobalConfig } from './config';

export default class App {
  id = '';
  name = '未命名';
  description = '暂无描述';
  init = noop;
  test = noop;
  config: Record<string, any> = {};
  globalConfig: GlobalConfig = config;
  state: Record<string, any> = {};
  crons: Record<string, any>[] = [];
  events: Record<string, any>[] = [];

  constructor(obj?: Record<string, any>) {
    obj && Object.assign(this, obj);
  }

  assets(path?: string) {
    return assets(this.id, path);
  }

  on(listen: string, event: any) {
    this.events.push({ listen, ...event });
  }

  cron(schedule: string, cron: any) {
    this.crons.push({ schedule, ...cron });
  }
}
