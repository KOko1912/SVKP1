// src/lib/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Endpoints candidatos por si tu backend usa rutas distintas.
// Si tu login es otro (p.ej. /api/usuarios/login), agrégalo aquí.
const LOGIN_ENDPOINTS = [
  '/api/auth/login',
  '/auth/login',
  '/api/v1/auth/login',
  '/api/usuarios/login',
  '/api/login',
];

function saveAuth(token, user) {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(user || {}));
    localStorage.setItem('auth', JSON.stringify({ token, user }));
  } catch { /* ignore storage errors */ }
}

async function tryLoginOn(path, payload) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Si el endpoint no existe o el método no es el correcto, probamos el siguiente
  if (res.status === 404 || res.status === 405) {
    return { skip: true };
  }

  // Otros errores: devolvemos el mensaje del backend si viene
  if (!res.ok) {
    let msg = 'Error al iniciar sesión';
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  // OK
  let data = {};
  try { data = await res.json(); } catch {}

  // Normalizamos campos posibles
  const token =
    data?.token ||
    data?.access_token ||
    data?.accessToken ||
    data?.jwt;

  const user =
    data?.usuario ||
    data?.user ||
    data?.profile ||
    data?.data?.usuario ||
    data?.data?.user ||
    null;

  if (!token) throw new Error('Respuesta inválida del servidor (sin token)');
  saveAuth(token, user);
  return { ok: true, token, usuario: user };
}
export default { apiLogin, authHeaders, apiLogout };
/**
 * Inicia sesión con { telefono, password } y guarda token/usuario en localStorage.
 * Devuelve { token, usuario } si todo sale bien.
 */
export async function apiLogin({ telefono, password }) {
  const payload = { telefono, password };

  let lastErr = null;
  for (const ep of LOGIN_ENDPOINTS) {
    try {
      const res = await tryLoginOn(ep, payload);
      if (res?.skip) continue;
      if (res?.ok) return { token: res.token, usuario: res.usuario };
    } catch (e) {
      // Guardamos el último error “real” para reportarlo si ninguno funciona
      lastErr = e;
      // Si fue 4xx distinto de 404/405 ya lo lanzó tryLoginOn y cortamos
      break;
    }
  }

  throw lastErr || new Error(
    'No se encontró un endpoint de login válido. Ajusta LOGIN_ENDPOINTS en src/lib/api.js'
  );
}

/* Opcional: helpers reutilizables */
export function authHeaders() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  return {
    ...(usuario?.id ? { 'x-user-id': usuario.id } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiLogout() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('auth');
  } catch {}
}
