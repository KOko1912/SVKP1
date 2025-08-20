// backend/src/modules/sdkadmin/routes.js
const express = require('express');
const { info, verify, change } = require('./service');

const router = express.Router();

/** GET /api/sdkadmin/info */
router.get('/info', async (_req, res, next) => {
  try {
    const data = await info();
    res.json({ ok: true, ...data });
  } catch (err) { next(err); }
});

/** POST /api/sdkadmin/verify { password } */
router.post('/verify', express.json(), async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'password es requerido' });

    const ok = await verify({ password });
    if (!ok) return res.status(401).json({ ok: false });
    return res.json({ ok: true });
  } catch (err) { next(err); }
});

/** POST /api/sdkadmin/change { current, next } */
router.post('/change', express.json(), async (req, res, next) => {
  try {
    const { current, next } = req.body || {};
    if (!current || !next) return res.status(400).json({ error: 'current y next son requeridos' });

    const r = await change({ current, next });
    if (r === null) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    return res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
