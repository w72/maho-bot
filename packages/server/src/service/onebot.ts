import WebSocket from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';

import log from 'service/log';
import config from 'service/config';
import message from 'service/message';
import { ensureImage } from 'utils';

class Meta {
  $raw;
  $admin;
  $cmd = '';
  $at = false;
  $image;

  constructor(e: any) {
    Object.assign(this, e);
    this.$raw = e;
    this.$admin = config.admins.includes(e.user_id);
    if (e.post_type.startsWith('message')) {
      this.$at = true;
      this.$image = e.message.find((v: any) => v.type === 'image')?.data;
      let cmd = e.message
        .filter((v: any) => v.type === 'text')
        .map((v: any) => v.data.text.trim())
        .join('');
      if (e.message_type === 'group') {
        const name = config.names.find((v) =>
          cmd.toLowerCase().startsWith(v.toLowerCase())
        );
        if (name) cmd = cmd.slice(name.length).trim();
        const isAtMe = e.message.some(
          (v: any) => v.type === 'at' && v.data.qq === String(e.self_id)
        );
        this.$at = isAtMe || Boolean(name);
      }
      this.$cmd = cmd;
    }
  }

  $operation(operation: any) {
    return api['.handle_quick_operation']({ context: this.$raw, operation });
  }

  $reply(reply: any, args: any = {}) {
    const { message_type } = this as any;
    if (message_type !== 'group') args.at_sender = false;
    return this.$operation({ reply, ...args });
  }

  $replyText(text: any, args: any) {
    return this.$reply(message().text(text), args);
  }

  async $replyImage(image: any, args: string) {
    image = await ensureImage(image);
    return this.$reply(message().image(image), args);
  }

  async $replyTextImage(text: string, image: any, args: any) {
    image = await ensureImage(image);
    return this.$reply(message().text(text).image(image), args);
  }

  async $replyImageText(image: any, text: any, args: any) {
    image = await ensureImage(image);
    return this.$reply(message().image(image).text(text), args);
  }
}

let listeners: Array<{
  app: string;
  listen: string;
  filter: {
    admin: boolean;
    at: boolean;
    pattern: RegExp;
    image: boolean;
  };
  handler: (e: any) => Promise<void> | void;
}> = [];

export function listen(app: string, event: any): void {
  listeners.push({ app, ...event });
}

export function unListen(app: string): void {
  listeners = listeners.filter((v) => v.app !== app);
}

async function emit(eventName: string, e: any) {
  for (const { filter, listen, handler } of listeners) {
    const { at, pattern, image, admin } = filter || {};
    if (listen !== eventName) continue;
    if (at && !e.$at) continue;
    if (image && !e.$image) continue;
    if (admin && !e.$admin) continue;
    if (pattern) {
      const match = pattern.exec(e.$cmd);
      if (!match) continue;
      e.$match = match;
    }
    await handler(e);
  }
}

const ws = new ReconnectingWebSocket(config.url, [], { WebSocket });
const resolves: Record<string, any> = {};

ws.addEventListener('message', (event) => {
  let e = JSON.parse(event.data);

  if (e.echo) {
    if (e.retcode === 0) {
      resolves[e.echo](e.data);
    } else {
      log.error('%o', e);
    }
    delete resolves[e.echo];
    return;
  }

  if (e.post_type === 'meta_event') return;
  if (e.group_id && !config.groups.includes(e.group_id)) return;

  const post_type = e.post_type;
  const type = post_type.startsWith('message')
    ? e.message_type
    : e[`${post_type}_type`];
  const sub_type = e.sub_type;
  const sub_sub_type = e.honor_type;

  e = new Meta(e);

  emit(`${post_type}`, e);
  emit(`${post_type}.${type}`, e);
  if (sub_type) emit(`${post_type}.${type}.${sub_type}`, e);
  if (sub_sub_type) {
    emit(`${post_type}.${type}.${sub_type}.${sub_sub_type}`, e);
  }
});

export const api = new Proxy({} as Record<string, any>, {
  get(_target, action) {
    return (params: any) => {
      const echo = Math.random().toString(36).slice(2);
      ws.send(JSON.stringify({ action, params, echo }));
      return new Promise((resolve) => {
        resolves[echo] = resolve;
      });
    };
  },
});
