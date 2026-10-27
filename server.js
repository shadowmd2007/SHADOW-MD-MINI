// 🌹 RANA FURQAN MD - FINAL ROOT SERVER.JS - ESM - 100% WORKING
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// 🌹 Middleware
app.use(express.json({ limit: '2mb' }));
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

// 🌹 DUMMY Pairing Store - TEST MODE
const attempts = new Map();

app.get('/api/info', (req,res)=>{
  res.json({
    botName: 'RANA FURQAN MD',
    ownerName: 'RANA FURQAN',
    image: 'https://i.ibb.co/BHfCmfbw/jawadmd.jpg',
    botImage: 'https://i.ibb.co/BHfCmfbw/jawadmd.jpg',
    ok: true
  });
});

app.get('/health', (req,res)=> res.json({ok:true, time: Date.now()}));

app.post('/api/pair', (req,res)=>{
  try{
    let number = (req.body?.number||'').toString().replace(/\D/g,'');
    if(!number || number.length < 10){
      return res.status(400).json({error:'Sahi number likho! Example: 923003719761'});
    }
    const id = Date.now().toString(36)+Math.random().toString(36).slice(2,8);
    const code = `${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}`;
    attempts.set(id, {code, number, created: Date.now()});
    console.log(`🌹 RANA FURQAN TEST PAIR ${number} => ${code} ID:${id}`);
    return res.json({id, code, status:'pending'});
  }catch(e){
    console.error(e);
    return res.status(500).json({error: e.message});
  }
});

app.get('/api/pair/:id', (req,res)=>{
  const a = attempts.get(req.params.id);
  if(!a) return res.status(404).json({error:'ID not found'});
  return res.json({code: a.code, status:'ok'});
});

app.delete('/api/pair/:id', (req,res)=>{
  attempts.delete(req.params.id);
  return res.json({ok:true});
});

// 🌹 Extra /pair route jo aapki index.html use karti hai
app.get('/pair', (req,res)=>{
  let number = (req.query?.number||'').toString().replace(/\D/g,'');
  if(!number) return res.status(400).json({error:'number required'});
  const id = Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const code = `${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}`;
  attempts.set(id, {code, number});
  console.log(`🌹 GET /pair ${number} => ${code}`);
  return res.json({id, code});
});

// 🌹 Public folder
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=> console.log(`🌹 RANA FURQAN MD Running on ${PORT} - Safari Mode`));

export default app;