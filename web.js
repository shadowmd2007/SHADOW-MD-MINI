import { config } from "./config.js";

export function registerWeb(app, getState) {
  app.get("/", (_req, res) => {
    res.send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.botName} Pairing</title><link rel="stylesheet" href="/style.css"></head>
<body>
<div class="bg"></div>
<main class="card">
  <div class="logo"><img src="${config.imageUrl}" alt="SHADOW MD"></div>
  <div class="tag">SM-MINI • MULTI DEVICE</div>
  <h1>${config.botName}</h1>
  <p class="muted">WEB PAIRING PANEL</p>
  <div class="line"></div>
  <label>WhatsApp Number</label>
  <input id="number" inputmode="numeric" placeholder="923001234567">
  <button id="pair">GET PAIRING CODE</button>
  <div id="result" class="result">Enter your number without +, spaces or dashes.</div>
  <div class="status" id="status">● Checking bot status...</div>
  <div class="links"><a href="${config.githubRepository}" target="_blank">GITHUB</a><a href="${config.channelLink}" target="_blank">CHANNEL</a><a href="${config.groupLink}" target="_blank">GROUP</a></div>
  <small>Owner: ${config.ownerName}</small>
</main>
<script>
const result=document.getElementById("result"), status=document.getElementById("status");
async function check(){try{const r=await fetch("/api/status"),d=await r.json();status.textContent=d.connected?"● BOT ONLINE":"● BOT READY FOR PAIRING";status.className="status "+(d.connected?"online":"");}catch{}}
document.getElementById("pair").onclick=async()=>{
 const n=document.getElementById("number").value.trim();
 result.textContent="Generating pairing code...";
 try{const r=await fetch("/api/pair",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:n})});const d=await r.json();
 if(!d.ok) throw new Error(d.error);
 if(d.needsReset){
   const ok=confirm("A previous WhatsApp session is already stored on this deployment. Reset that session and generate a new pairing code?");
   if(!ok){ result.textContent="Existing session kept. No pairing code was generated."; return; }
   result.textContent="Resetting old session...";
   const rr=await fetch("/api/pair",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:n,reset:true})});
   const rd=await rr.json();
   if(!rd.ok) throw new Error(rd.error);
   if(!rd.code) throw new Error("Pairing code was not returned. Check Railway logs.");
   d=rd;
 }
 result.innerHTML=d.code?'<b>PAIRING CODE</b><strong>'+d.code+'</strong><span>Open WhatsApp → Linked devices → Link a device → Link with phone number instead. If WhatsApp shows no notification, open Linked devices manually.</span>':"Already connected.";
 }catch(e){result.textContent="❌ "+e.message}
};
check();setInterval(check,5000);
</script></body></html>`);
  });

  app.get("/style.css", (_req, res) => {
    res.type("text/css").send(`
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#050509;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;overflow:hidden}.bg{position:fixed;inset:0;background:radial-gradient(circle at 15% 20%,#5b00ff33,transparent 32%),radial-gradient(circle at 85% 70%,#00e5ff22,transparent 30%),linear-gradient(135deg,#050509,#10051c,#030812)}.bg:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,#ffffff06 4px)}.card{position:relative;width:min(440px,92vw);padding:34px 26px;border:1px solid #ffffff1f;border-radius:24px;background:#0a0a10dd;backdrop-filter:blur(16px);box-shadow:0 0 60px #7b2cff22;text-align:center}.logo{width:92px;height:92px;margin:auto;border-radius:50%;padding:3px;background:linear-gradient(135deg,#00e5ff,#a100ff,#ff0077)}.logo img{width:100%;height:100%;object-fit:cover;border-radius:50%;background:#111}.tag{font-size:11px;letter-spacing:3px;margin-top:18px;color:#bdb7ff}h1{font-size:34px;margin:8px 0 0;letter-spacing:2px}.muted{font-size:12px;letter-spacing:4px;color:#777}.line{height:1px;background:#ffffff18;margin:22px 0}label{display:block;text-align:left;font-size:12px;color:#aaa;margin-bottom:7px}input{width:100%;padding:15px;border-radius:12px;border:1px solid #ffffff18;background:#050508;color:white;outline:none;font-size:16px}button{width:100%;margin-top:12px;padding:15px;border:0;border-radius:12px;background:linear-gradient(90deg,#6b2cff,#d000ff);color:white;font-weight:800;letter-spacing:1px;cursor:pointer}.result{min-height:74px;margin-top:14px;padding:14px;border-radius:12px;background:#ffffff08;color:#aaa;font-size:13px;display:grid;place-items:center;gap:5px}.result strong{font-size:27px;letter-spacing:5px;color:#fff}.result span{font-size:11px}.status{margin:15px 0;color:#aaa;font-size:12px}.status.online{color:#35ff8a}.links{display:flex;justify-content:center;gap:18px;margin:16px 0}.links a{color:#aaa;text-decoration:none;font-size:11px;letter-spacing:1px}.links a:hover{color:#fff}small{color:#555}`);
  });

  app.get("/api/status", (_req, res) => {
    const s = getState();
    res.json({ ok: true, connected: s.connected, user: s.user, pairingInProgress: s.pairingInProgress });
  });
}

