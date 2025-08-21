// backend/routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const prisma = require('../lib/prisma');

// Helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';

function pickPassword(body) {
  return body?.password ?? body?.contraseña ?? body?.contrasena ?? null;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, contraseña, ...rest } = u; // contraseña por si acaso
  return rest;
}

// Validaciones
const registroSchema = Joi.object({
  nombre: Joi.string().min(2).max(80).allow('', null),
  nombreUsuario: Joi.string().min(2).max(80).allow('', null),
  telefono: Joi.string().min(6).max(20).required(),
  password: Joi.string().min(6).max(100).optional(),
  contraseña: Joi.string().min(6).max(100).optional(),
  contrasena: Joi.string().min(6).max(100).optional()
});

const loginSchema = Joi.object({
  telefono: Joi.string().min(6).max(20).required(),
  password: Joi.string().min(6).max(100).optional(),
  contraseña: Joi.string().min(6).max(100).optional(),
  contrasena: Joi.string().min(6).max(100).optional()
});

// POST /api/usuarios/registro
router.post('/registro', async (req, res) => {
  try {
    const body = await registroSchema.validateAsync(req.body, { abortEarly: false });
    const telefono = body.telefono.trim();
    const nombre = (body.nombre ?? body.nombreUsuario ?? '').trim();
    const rawPass = pickPassword(body);

    if (!rawPass) {
      return res.status(400).json({ ok: false, error: 'Falta password/contraseña' });
    }

    // ¿existe ya?
    const exists = await prisma.usuario.findUnique({ where: { telefono } });
    if (exists) {
      return res.status(409).json({ ok: false, error: 'El teléfono ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(rawPass, 10);

    const user = await prisma.usuario.create({
      data: {
        nombre,
        telefono,
        passwordHash, // mapeado a columna "contraseña" por @map en el schema
      }
    });

    // Token de acceso (opcional)
    const token = jwt.sign(
      { sub: user.id, tel: user.telefono },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    res.status(201).json({ ok: true, user: sanitizeUser(user), token });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ ok: false, error: 'Datos inválidos', details: err.details });
    }
    // Prisma: unique violation
    if (err?.code === 'P2002') {
      return res.status(409).json({ ok: false, error: 'Duplicado' });
    }
    console.error('Registro error:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const body = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const telefono = body.telefono.trim();
    const rawPass = pickPassword(body);

    if (!rawPass) {
      return res.status(400).json({ ok: false, error: 'Falta password/contraseña' });
    }

    const user = await prisma.usuario.findUnique({ where: { telefono } });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(rawPass, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id, tel: user.telefono },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES }
    );

    res.json({ ok: true, user: sanitizeUser(user), token });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ ok: false, error: 'Datos inválidos', details: err.details });
    }
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

// GET /api/usuarios/me  (opcional para probar token)
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Token requerido' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: 'Token inválido' });
    }

    const user = await prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

module.exports = router;
