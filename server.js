'use strict';
/**
 * Web server: serves the pairing website (public/) and a small JSON API.
 * Public endpoints expose only attempt status + the short-lived pairing code.
 */
const path = require('path');
const express = require('express');
const { PairingError } = require('./sessionManager');

function createServer({ config, manager, logger }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Railway sits behind a proxy

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' https://i.ibb.co data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
    next();
  });
  app.use(express.json({ limit: '2kb' }));

  // ---- very small in-memory rate limiter for starting pairings ----
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
    for (const [ip, arr] of hits) if (!arr.some((t) => now - t < 60000)) hits.delete(ip);
  }, 60000);
  gc.unref?.();

  // ---- API ----
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

  // ---- pairing website ----
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '5m', index: 'index.html' }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request body.' });
    logger.error({ err: err && err.message }, 'express error');
    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

module.exports = { createServer };
