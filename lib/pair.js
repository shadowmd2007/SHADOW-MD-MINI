// 🌹 TEST MODE - RANA FURQAN MD
export class PairingError extends Error {
  constructor(msg, status=400){ super(msg); this.httpStatus=status; }
}

const attempts = new Map();

export function getPublic(id){
  const a = attempts.get(id);
  return a ? a.public : null;
}
export function cancel(id){ return attempts.delete(id); }
export function stats(){ return {total: attempts.size}; }

export async function startPairing(rawNumber){
  let number = (rawNumber||'').toString().replace(/\D/g,'');
  if(!number || number.length < 10) throw new PairingError('Sahi number likho!', 400);
  
  const id = Date.now().toString(36)+Math.random().toString(36).slice(2);
  const pub = { 
    status: 'pending', 
    code: (Math.floor(1000+Math.random()*9000)+'-'+Math.floor(1000+Math.random()*9000)),
    created: Date.now() 
  };
  attempts.set(id, {public: pub});
  console.log(`🌹 TEST CODE for ${number}: ${pub.code} ID: ${id}`);
  return { id, ...pub };
}

export function createSessionManager(){
  return { stats, getPublic, cancel, startPairing, on: ()=>{} };
}