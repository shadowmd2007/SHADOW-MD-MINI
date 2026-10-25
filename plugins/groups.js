import store from '../lib/store.js';
import config from '../config.js';
import * as U from '../lib/utils.js';

export async function onGroupUpdate(sock, { id, participants, action }) {
  try {
    const welcome = store.sub('welcome', id);
    const goodbye = store.sub('goodbye', id);
    if ((action === 'add' && !welcome) || (action === 'remove' && !goodbye)) return;

    const meta = await U.getMeta(sock, id).catch(() => null);
    for (const p of participants) {
      const jid = typeof p === 'string' ? p : p.id;
      let text = action === 'add'
        ? `*Welcome* @${jid.split('@')[0]} \n\nGroup: *${meta?.subject}*\nMembers: ${meta?.participants?.length || ''}\n\nRules Ke liye ${store.get('prefix')}rules likho.\n\nAllah hafiz ${store.get('botName')}`
        : `Allah hafiz @${jid.split('@')[0]}\n hum tumhe miss karenge.\n\n${store.get('botName')}`;

      let img = null;
      try { img = await sock.profilePictureUrl(jid, 'image').catch(() => null); } catch {}
      if (img) {
        await sock.sendMessage(id, { image: { url: img }, caption: text, mentions: [jid] }).catch(() => sock.sendMessage(id, { text, mentions: [jid] }));
      } else {
        await sock.sendMessage(id, { text, mentions: [jid] });
      }
    }
  } catch (e) {
    console.error('group update:', e.message);
  }
}