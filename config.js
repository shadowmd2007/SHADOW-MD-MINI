cd /home/claude/shadow && sed -i 's/, \["sum", "add2"\]/, ["sum"]/' /home/claude/newblock2.js && python3 - <<'EOF'
p='commands.js'
s=open(p,encoding='utf-8').read()
blk=open('/home/claude/newblock2.js',encoding='utf-8').read()

s=s.replace('import os from "node:os";','import os from "node:os";\nimport fs from "node:fs";\nimport path from "node:path";',1)
old='import { jidNumber, formatUptime, getContext, getTargets } from "./utils.js";'
assert old in s
s=s.replace(old,'import { jidNumber, formatUptime, getContext, getTargets, isAdminIn } from "./utils.js";',1)

marker='/* ───────────── NEEDS AN EXTERNAL API ───────────── */'
assert marker in s
s=s.replace(marker, blk+marker,1)

old='"sticker", "toimg", "tourl", "removebg"'
assert old in s
s=s.replace(old,'"sticker", "toimg", "tourl", "removebg", "emojimix", "antidelete"',1)
open(p,'w',encoding='utf-8').write(s)

c=open('config.js',encoding='utf-8').read()
c=c.replace('import fs from "node:fs";','import fs from "node:fs";\nimport path from "node:path";',1)
old='''const env = process.env;
const onRailway = fs.existsSync("/app");
'''
new='''const env = process.env;
const onRailway = fs.existsSync("/app");
const authDir = env.AUTH_DIR || (onRailway ? "/app/data/shadow-auth" : "./data/shadow-auth");

// Settings saved by the bot itself (e.g. .setprefix) live next to the login.
let saved = {};
try {
  saved = JSON.parse(fs.readFileSync(path.join(path.dirname(authDir), "bot-data.json"), "utf8"));
} catch {
  /* nothing saved yet */
}
'''
assert old in c; c=c.replace(old,new,1)
c=c.replace('prefix: env.PREFIX || ".",','prefix: env.PREFIX || saved.prefix || ".",',1)
old='  authDir: env.AUTH_DIR || (onRailway ? "/app/data/shadow-auth" : "./data/shadow-auth"),'
assert old in c; c=c.replace(old,'  authDir,',1)
c=c.replace('version: "2.1.0"','version: "2.2.0"',1)
open('config.js','w',encoding='utf-8').write(c)
EOF
for f in *.js; do node --check "$f" && echo "OK $f"; done
cat config.js | head -30
node -e "
import('./commands.js').then(m=>{
 const real=new Set([...m.commands.values()].filter(c=>c.category!=='Needs API'));
 console.log('working commands:',real.size);
 const seen='8ball add admins aliases alive announce antidelete avg base64 binary botinfo calc channel choose coinflip compliment count dare date demote dice divide emojimix fact group groupid groupinfo help hidetag hug id joke kick kiss leave lock love lower max members menu min minus morse multiply mute owner pct ping plus power promote quote repo restart reverse roast round rules runtime setprefix ship slap speed sqrt status tagall time truth unbase64 unbinary unlock unmute upper url week whoami year'.split(' ');
 console.log('still missing from old folder list:',seen.filter(n=>!m.commands.has(n)).join(' ')||'NONE');
})"