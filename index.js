// ... pura upar wala code same hai bas ye function replace karo ...

    // ✅ CHECKED PAIRING LOGIC - FINAL FIX WITH REAL ERROR
    if (number && !state.creds.registered) {
      await new Promise(r => setTimeout(r, 3000));
      if (sock === current && !state.creds.registered) {
        try {
          console.log(`Requesting pair code for ${number}`);
          // Baileys ko number sirf number chahiye, + nahi
          const raw = await current.requestPairingCode(number);
          const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          pairCode = clean.match(/.{1,4}/g).join('-');
          console.log(`✅ PAIR CODE: ${pairCode}`);
        } catch (e) {
          console.error('Pair fail REAL REASON:', e);
          // Real error ko screen pe dikhao taake pata chale
          let msg = e?.message || JSON.stringify(e);
          if (msg.includes('428')) msg = 'Connection Closed - Auth Reset Karo';
          if (msg.includes('401')) msg = 'Number Blocked 10min Wait Karo';
          if (msg.includes('409')) msg = 'Already Paired - Login Folder Delete Karo';
          
          pairCode = msg.slice(0, 80);

          // Agar 409 ya 428 aaye to auth auto delete
          try {
            if (msg.includes('409') || msg.includes('428')) {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
              console.log('Auth auto-deleted for retry');
            }
          } catch {}
        }
      }
    }