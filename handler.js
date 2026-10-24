export let settings;

export async function loadCommands(){
  try{
    const mod = await import('./commands.js?v='+Date.now());
    settings = mod.settings;
    console.log('COMMANDS LOADED:', mod.totalCommands());
    return mod.totalCommands();
  }catch(e){
    console.log('Load Error', e.message);
    return 0;
  }
}

export async function onMessage(sock, upsert){
  const m = upsert.messages?.[0];
  if(!m || !m.message) return;
  try{
    const mod = await import('./commands.js?v='+Date.now());
    await mod.handleMessage(sock, m);
  }catch(e){
    console.log('onMessage error', e.message);
  }
}

export async function onDelete(sock, updates){
  return;
}