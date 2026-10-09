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
 try{const r=await fetch("/api/pair",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({number:n})});let d=await r.json();
 if(!d.ok) throw new Error(d.error||"Failed");
 if(d.needsReset){
   const ok=confirm("A previous session exists. Reset and get new code?");
   if(!ok){ result.textContent="Existing session kept."; return; }
   result.textContent="Resetting...";
   const rr=await fetch("/api/pair",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON