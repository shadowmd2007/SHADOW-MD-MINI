import { jidNormalizedUser } from '@whiskeysockets/baileys';
import store from '../lib/store.js';
import config from '../config.js';
import * as U from '../lib/utils.js';

export async function onGroupUpdate(sock, { id, participants, action }) {
  try {
    U.clearMeta(id);
    const welcome = store.sub('welcome', id), goodbye = store.sub('goodbye', id);
    if (!(action === 'add' && welcome) && !(action === 'remove' && goodbye)) return;
    const meta = await U.getMeta(sock, id).catch(() => null);
    for (const p of participants) {
      const jid = jidNormalizedUser(typeof p === 'string' ? p : p.id);
      const n = U.num(jid);
      let text = action === 'add'
        ? `👋 *Welcome* @${n}\n\n🏷️ Group: *${meta?.subject || ''}*\n👥 Members: ${meta?.participants?.length || ''}\n\n📜 Rules ke liye *${store.get('prefix')}rules* likho.\n\n_${store.get('botName')}_`
        : `👋 Allah hafiz @${n}, hum tumhe miss karenge.\n\n_${store.get('botName')}_`;
      let img = null;
      try { img = await sock.profilePictureUrl(jid, 'image'); } catch { img = config.botImage; }
      await sock.sendMessage(id, { image: { url: img }, caption: text, mentions: [jid] }).catch(() =>
        sock.sendMessage(id, { text, mentions: [jid] }));
    }
  } catch (e) { console.error('group update:', e.message); }
}