import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const app = await NestFactory.create(AppModule);
await app.listen(3000);

declare const module: any;

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => app.close());
}
