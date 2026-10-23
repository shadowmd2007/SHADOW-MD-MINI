// Add this line in /pair route - purane auth ko delete karna
app.get('/pair', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number dalo'});
  
  // 🔥 Sab purane temp auth delete karo
  const authMain = path.join(__dirname,'auth','main');
  const tempDir = path.join(__dirname,'auth','temp_'+num);
  if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});
  if(fs.existsSync(authMain)) fs.rmSync(authMain,{recursive:true,force:true}); // Important!
  fs.mkdirSync(tempDir,{recursive:true});
  
  try{
    const {state,saveCreds}=await useMultiFileAuthState(tempDir);
    const tempSock=makeWASocket({
      auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))},
      logger:pino({level:'silent'}),
      browser:Browsers.macOS('Chrome'),
      printQRInTerminal:false
    });
    tempSock.ev.on('creds.update',saveCreds);
    
    // 3 sec wait - pehle se zyada
    await new Promise(r=>setTimeout(r,3000));
    
    if(!tempSock.authState.creds.registered){
      const code=await tempSock.requestPairingCode(num);
      console.log("PAIR CODE:",code,"for",num);
      res.json({code});
    } else {
      res.json({error:'Already registered'});
    }
    
    setTimeout(()=>{try{tempSock.end()}catch{}},120000); // 2 min tak zinda rakho
  }catch(e){
    console.log("PAIR ERROR:",e);
    res.json({error:e.message});
  }
});