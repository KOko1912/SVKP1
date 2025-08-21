// backend/src/modules/auth/routes.js
const express = require('express');
const prisma = require('../../config/db');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }

const router = express.Router();

function cleanUser(u) {
  if (!u) return null;
  const { password, contrasena, ...safe } = u;
  return safe;
}

router.post('/login', async (req, res) => {
  try {
    const { telefono, password } = req.body || {};
    if (!telefono || !password) {
      return res.status(400).json({ error: 'Teléfono y contraseña son requeridos' });
    }

    const user = await prisma.usuario.findFirst({
      where: { telefono: String(telefono) },
      include: { tienda: true },
    });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const stored = user.password ?? user.contrasena ?? '';
    let ok = false;
    if (stored && bcrypt && stored.startsWith('$2')) {
      ok = await bcrypt.compare(String(password), stored);
    } else {
      ok = String(password) === String(stored);
    }
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    // compat: usamos el ID numérico como “token” porque tu API ya lo acepta (Bearer <id>)
    const token = String(user.id);
    return res.json({ token, usuario: cleanUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

module.exports = router;
