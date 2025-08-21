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

    // cubrimos distintos nombres de columna que pueda mapear Prisma
    const stored =
      user.password ??
      user.contrasena ??
      user['contraseña'] ??
      '';

    let ok = false;
    if (stored && stored.startsWith('$2')) {
      // hash bcrypt -> necesitamos bcryptjs instalado
      if (!bcrypt) bcrypt = require('bcryptjs');
      ok = await bcrypt.compare(String(password), stored);
    } else {
      // contraseña en texto plano (casos legacy)
      ok = String(password) === String(stored);
    }

    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Compatibilidad: usamos el id como “token” (tu middleware ya acepta Bearer <id>)
    const token = String(user.id);
    return res.json({ token, usuario: cleanUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
  }
});

module.exports = router;
