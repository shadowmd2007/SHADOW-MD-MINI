app.get('/pair', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number required'});
  const tempPath=path.join(__dirname,'auth','temp_'+num);
  try{
    if(fs.existsSync(tempPath)) fs.rmSync(tempPath,{recursive:true,force:true});
    fs.mkdirSync(tempPath,{recursive:true});
    const {state, saveCreds}=await useMultiFileAuthState(tempPath);
    const sock=makeWASocket({
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))},
      logger:pino({level:'silent'}),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal:false,
      syncFullHistory:false
    });
    sock.ev.on('creds.update', saveCreds);
    
    // Wait for connection
    await new Promise(r=>setTimeout(r,4000));
    
    if(!sock.authState.creds.registered){
      try{
        const code=await sock.requestPairingCode(num);
        console.log('PAIR CODE: '+code+' FOR '+num);
        return res.json({code});
      }catch(e){
        console.log('Pair error:', e.message);
        if(e.message.includes('Connection Closed')){
          return res.json({error:'Connection Closed - 10 sec wait karke dobara try karo! WhatsApp thora time leta hai'});
        }
        return res.json({error:e.message});
      }
    } else {
      return res.json({error:'Already registered'});
    }
  }catch(e){ console.log(e); res.json({error:e.message}); }
});