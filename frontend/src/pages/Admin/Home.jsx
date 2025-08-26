// frontend/src/pages/Admin/Home.jsx
import { useEffect, useMemo, useState } from 'react';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = RAW_API.replace(/\/$/, ''); // evita doble slash
const LOCAL_SECRET_KEY = 'admin_secret';
const DEFAULT_SECRET = 'super_admin_123'; // Debe coincidir con ADMIN_SECRET del backend

export default function AdminHome() {
  const [adminPass, setAdminPass] = useState('');
  const [secret, setSecret] = useState(localStorage.getItem(LOCAL_SECRET_KEY) || '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);

  const hasSecret = useMemo(() => Boolean(secret && secret.trim()), [secret]);

  const setAndPersistSecret = (sec) => {
    localStorage.setItem(LOCAL_SECRET_KEY, sec);
    setSecret(sec);
  };

  const clearSecret = () => {
    localStorage.removeItem(LOCAL_SECRET_KEY);
    setSecret('');
  };

  const fetchJSON = async (url, init = {}) => {
    const opts = {
      mode: 'cors',
      ...init,
    };
    const res = await fetch(url, opts);
    // Intenta parsear JSON siempre, aún en error
    let data = null;
    try {
      data = await res.json();
    } catch {
      // si no es JSON, data queda null
    }
    if (!res.ok) {
      const msg =
        data?.error ||
        data?.message ||
        `Error ${res.status} al consultar ${url}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  };

  // Carga solicitudes usando el secret (si falta, lanzará 401/403)
  const cargarSolicitudes = async (sec = secret) => {
    setError('');
    setCargando(true);
    try {
      const data = await fetchJSON(`${API}/api/admin/solicitudes-vendedor`, {
        headers: { 'x-admin-secret': sec || '' },
      });
      setSolicitudes(data?.data || data?.items || []);
    } catch (e) {
      setSolicitudes([]);
      // Si el backend rechaza por credenciales, limpiamos el secret
      if (e?.status === 401 || e?.status === 403) {
        clearSecret();
        setError('No autorizado. Vuelve a iniciar sesión como admin.');
      } else if (e?.message?.includes('Failed to fetch') || e?.message?.includes('ERR_FAILED')) {
        setError('No se pudo conectar con el servidor (CORS o servidor caído).');
      } else {
        setError(e.message || 'Error al cargar solicitudes');
      }
    } finally {
      setCargando(false);
    }
  };

  // Login con contraseña almacenada en la tabla SDKADMIN
  const loginAdmin = async () => {
    setError('');
    if (!adminPass) {
      setError('Ingresa la contraseña de SDKADMIN');
      return;
    }
    try {
      const data = await fetchJSON(`${API}/api/sdkadmin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      if (!data?.ok) throw new Error('Contraseña incorrecta');

      // Usa el secret del backend: si tu backend expone ADMIN_SECRET en la respuesta, úsalo.
      // Si no lo expone, usamos el DEFAULT_SECRET (asegúrate que coincide con ADMIN_SECRET del backend).
      const SEC = data?.secret || DEFAULT_SECRET;
      setAndPersistSecret(SEC);

      setAdminPass('');
      await cargarSolicitudes(SEC);
    } catch (e) {
      if (e?.message?.includes('Failed to fetch') || e?.message?.includes('ERR_FAILED')) {
        setError('No se pudo conectar con el servidor (CORS o servidor caído).');
      } else {
        setError(e.message || 'No se pudo iniciar sesión');
      }
    }
  };

  const logoutAdmin = () => {
    clearSecret();
    setSolicitudes([]);
    setAdminPass('');
    setError('');
  };

  // Si hay secret almacenado, intenta cargar de inmediato (y se limpiará si es inválido)
  useEffect(() => {
    if (hasSecret) {
      cargarSolicitudes(secret);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSecret]);

  const accion = async (id, tipo) => {
    setError('');
    setCargando(true);
    try {
      const url = `${API}/api/admin/vendedores/${id}/${tipo}`;
      await fetchJSON(url, {
        method: 'POST',
        headers: { 'x-admin-secret': secret || '' },
      });
      await cargarSolicitudes(secret);
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) {
        clearSecret();
        setError('No autorizado. Vuelve a iniciar sesión como admin.');
      } else if (e?.message?.includes('Failed to fetch') || e?.message?.includes('ERR_FAILED')) {
        setError('No se pudo conectar con el servidor (CORS o servidor caído).');
      } else {
        setError(e.message || `No se pudo ${tipo}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const onKeyDown = (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      loginAdmin();
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>👑 SystemVkode Administrador</h2>
        {hasSecret ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => cargarSolicitudes(secret)} className="secondary-button" disabled={cargando}>
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button onClick={logoutAdmin} className="secondary-button">Salir</button>
          </div>
        ) : null}
      </header>

      {!hasSecret ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 16,
            maxWidth: 420,
          }}
        >
          <input
            type="password"
            placeholder="Contraseña SDKADMIN"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              flex: 1,
              padding: 10,
              border: '1px solid #2b2e3d',
              borderRadius: 10,
              background: 'rgba(255,255,255,.06)',
              color: '#e9edf5',
            }}
          />
          <button onClick={loginAdmin} className="primary-button">
            Ingresar
          </button>
        </div>
      ) : (
        <p style={{ color: 'green', marginTop: 0 }}>Sesión admin activa</p>
      )}

      {error && (
        <p style={{ color: 'salmon', marginTop: 8 }}>
          {error}
          {error.includes('CORS') && (
            <>
              <br />
              <small>
                Revisa CORS en backend: permite el header <code>x-admin-secret</code> y el origen <code>http://localhost:5173</code>.
              </small>
            </>
          )}
        </p>
      )}
      {cargando && <p>Cargando…</p>}

      {hasSecret && !cargando && solicitudes.length === 0 && !error && (
        <p>No hay solicitudes pendientes.</p>
      )}

      {hasSecret && solicitudes.length > 0 && (
        <div className="card-svk" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Nombre</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Teléfono</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Foto</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #2b2e3d' }}>
                  <td style={{ padding: 8 }}>{u.id}</td>
                  <td style={{ padding: 8 }}>{u.nombre}</td>
                  <td style={{ padding: 8 }}>{u.telefono}</td>
                  <td style={{ padding: 8 }}>
                    {u.fotoUrl
                      ? (
                        <img
                          src={`${API}${u.fotoUrl}`}
                          alt="foto"
                          width={40}
                          height={40}
                          style={{ objectFit: 'cover', borderRadius: 6 }}
                        />
                        )
                      : '—'}
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                    <button className="primary-button" onClick={() => accion(u.id, 'aprobar')} disabled={cargando}>
                      Aprobar
                    </button>
                    <button className="secondary-button" onClick={() => accion(u.id, 'rechazar')} disabled={cargando}>
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
