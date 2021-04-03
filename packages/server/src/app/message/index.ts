import App from 'service/app';
import assets from 'service/assets';
import message from 'service/message';
import { api } from 'service/onebot';

const app = new App({
  name: '消息与通知管理',
  description: '同意添加好友请求，发送群成员变动通知，响应特定消息',
  state: { repeat: {} },
});

app.on('message.group', {
  name: '复读',
  handler: async (e: any) => {
    const repeat = app.state.repeat[e.group_id];
    if (!repeat) {
      app.state.repeat[e.group_id] = { message: e.raw_message, count: 1 };
    } else if (repeat.message !== e.raw_message) {
      delete app.state.repeat[e.group_id];
    } else {
      repeat.count++;
      if (!repeat.done && Math.random() < 1 - 1 / 1.4 ** repeat.count) {
        repeat.done = true;
        await e.$reply(e.raw_message, { at_sender: false });
      }
    }
  },
});

app.on('message_sent.group', {
  name: '复读-自身发送消息会打断复读',
  handler: (e: any) => {
    const repeat = app.state.repeat[e.group_id];
    if (repeat && repeat.message !== e.raw_message) {
      delete app.state.repeat[e.group_id];
    }
  },
});

app.on('message', {
  name: '在吗？',
  filter: { at: true, pattern: /^在[？?]$/ },
  doc: [{ message: '在?', reply: '在呀！' }],
  handler: (e: any) => e.$replyText('在呀！'),
});

app.on('message', {
  name: '查看版本',
  filter: { pattern: /^version$/ },
  handler: (e: any) => e.$replyText('maho-bot[v4.0.0.alpha16]源码版'),
});

app.on('message.group', {
  name: '老婆',
  filter: { at: true, pattern: /^老婆$/ },
  handler: (e: any) => e.$replyImage(app.assets('laopo.jpg')),
});

app.on('request.friend', {
  name: '自动同意好友申请',
  handler: (e: any) => e.$operation({ approve: true }),
});

app.on('notice.group_increase', {
  name: '群成员增加时提示',
  handler: async (e: any) => {
    const { self_id, group_id, user_id } = e;
    if (user_id === self_id) return;
    await api.send_group_msg({
      group_id,
      message: message().at(user_id).text('加入了群聊'),
    });
  },
});

app.on('notice.group_decrease', {
  name: '群成员减少时提示',
  handler: async (e: any) => {
    const { self_id, sub_type, group_id, operator_id, user_id } = e;
    if (sub_type === 'kick_me') return;
    if (sub_type === 'leave' && user_id === self_id) return;
    const { nickname } = await api.get_stranger_info({ user_id });
    if (sub_type === 'leave') {
      const message = `${nickname}（${user_id}）主动退群了`;
      await api.send_group_msg({ group_id, message });
    }
    if (sub_type === 'kick') {
      const {
        card,
        nickname: operator_nickname,
      } = await api.get_group_member_info({
        group_id,
        user_id: operator_id,
      });
      const message = `${
        card || operator_nickname
      }（${operator_id}）将${nickname}（${user_id}）踢出了群`;
      await api.send_group_msg({ group_id, message });
    }
  },
});

export default app;
