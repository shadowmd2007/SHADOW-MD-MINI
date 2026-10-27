'use strict';
const path = require('path');
const express = require('express');
const { PairingError } = require('./sessionManager');

function createServer({ config, manager, logger }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });

  app.use(express.json({ limit: '2kb' }));

  const hits = new Map();
  const limiter = (req, res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) || []).filter((t) => now - t < 60000);
    if (arr.length >= config.pairing.rateLimitPerMinute) {
      return res.status(429).json({ error: 'Too many attempts. Please wait a minute and try again.' });
    }
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };

  const gc = setInterval(() => {
    const now = Date.now();
    for (const [ip, arr] of hits) {
      if (!arr.some((t) => now - t < 60000)) hits.delete(ip);
    }
  }, 60000);
  gc.unref?.();

  app.get('/health', (req, res) => res.json({ ok: true, ...manager.stats() }));

  app.get('/api/info', (req, res) => {
    res.json({
      botName: config.botName,
      ownerName: config.ownerName,
      channelName: config.channel.name,
      channelLink: config.channel.link,
      groupName: config.group.name,
      groupLink: config.group.link,
      githubUrl: config.github.url,
      image: config.botImage,
      codeTtlSeconds: Math.round(config.pairing.attemptTtlMs / 1000),
    });
  });

  app.post('/api/pair', limiter, async (req, res) => {
    try {
      const attempt = await manager.startPairing(req.body && req.body.number);
      res.status(201).json({ id: attempt.id, ...manager.getPublic(attempt.id) });
    } catch (e) {
      if (e instanceof PairingError) return res.status(e.httpStatus).json({ error: e.message });
      logger.error({ err: e.message }, 'pairing start failed');
      res.status(500).json({ error: 'Unexpected server error. Please try again.' });
    }
  });

  const validId = (id) => /^[a-f0-9]{32}$/.test(id);

  app.get('/api/pair/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Unknown pairing attempt.' });
    const view = manager.getPublic(req.params.id);
    if (!view) return res.status(404).json({ error: 'Unknown or expired pairing attempt.' });
    res.json(view);
  });

  app.delete('/api/pair/:id', (req, res) => {
    if (!validId(req.params.id) || !manager.cancel(req.params.id)) return res.status(404).json({ error: 'Unknown pairing attempt.' });
    res.json({ ok: true });
  });

  app.get('/pair', limiter, async (req, res) => {
    try {
      const number = (req.query.number || '').toString();
      const attempt = await manager.startPairing(number);
      let view = manager.getPublic(attempt.id);
      let tries = 0;
      while(tries < 15 && (!view || !view.code)){
        await new Promise(r=>setTimeout(r,1000));
        view = manager.getPublic(attempt.id);
        tries++;
      }
      if(view && view.code) return res.json({ code: view.code, id: attempt.id });
      return res.json({ id: attempt.id, ...view });
    } catch (e) {
      if (e instanceof PairingError) return res.status(e.httpStatus).json({ error: e.message });
      logger.error({ err: e.message }, 'pairing start failed /pair');
      res.status(500).json({ error: 'Unexpected server error. Please try again.' });
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '5m', index: 'index.html' }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
    logger.error({ err: err && err.message }, 'express error');
    res.status(500).json({ error: 'Unexpected server error.' });
  });
  return app;
}
module.exports = { createServer };