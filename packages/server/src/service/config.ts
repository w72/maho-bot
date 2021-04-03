import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import log from 'service/log';

export interface GlobalConfig {
  url: string;
  dev: boolean;
  tests: string[];
  names: string[];
  admins: number[];
  groups: number[];
  app: Record<string, any>;
  apps: Record<string, Record<string, any>>;
}

const configFile = path.join(__dirname, '../config.yml');
const config = yaml.load(fs.readFileSync(configFile, 'utf8')) as GlobalConfig;

fs.watchFile(configFile, { interval: 1000 }, async () => {
  const configNew = yaml.load(await fs.promises.readFile(configFile, 'utf8'));
  log.info('config file reloaded');
  Object.assign(config, configNew);
});

export default config;
