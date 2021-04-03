import pino from 'pino';
import { execSync } from 'child_process';

if (process.platform === 'win32') execSync('chcp 65001');

export default pino({
  prettyPrint: {
    levelFirst: true,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
    ignore: 'pid,hostname',
  },
});
