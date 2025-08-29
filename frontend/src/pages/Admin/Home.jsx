// frontend/src/pages/Admin/Home.jsx
import { useEffect, useMemo, useState } from 'react';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = RAW_API.replace(/\/$/, '');
const LOCAL_SECRET_KEY = 'admin_secret'; // donde guardamos el x-admin-secret

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
    const opts = { mode: 'cors', ...init };
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.error || data?.message || `Error ${res.status} al consultar ${url}`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return data;
  };

  const cargarSolicitudes = async (sec = secret) => {
    setError(''); setCargando(true);
    try {
      const data = await fetchJSON(`${API}/api/admin/solicitudes-vendedor`, {
        headers: { 'x-admin-secret': sec || '' },
      });
      setSolicitudes(data?.data || data?.items || []);
    } catch (e) {
      setSolicitudes([]);
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

  // === NUEVO: login directo contra /api/admin/login ===
  const loginAdmin = async () => {
    setError('');
    if (!adminPass) return setError('Ingresa la contraseña de administrador');
    try {
      const data = await fetchJSON(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      if (!data?.ok || !data?.secret) throw new Error('Credenciales inválidas');
      setAndPersistSecret(data.secret);
      setAdminPass('');
      await cargarSolicitudes(data.secret);
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

  useEffect(() => {
    if (hasSecret) cargarSolicitudes(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSecret]);

  const accion = async (id, tipo) => {
    setError(''); setCargando(true);
    try {
      await fetchJSON(`${API}/api/admin/vendedores/${id}/${tipo}`, {
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
    if (ev.key === 'Enter') { ev.preventDefault(); loginAdmin(); }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h2 style={{ margin:0 }}>👑 SystemVkode Administrador</h2>
        {hasSecret && (
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => cargarSolicitudes(secret)} className="secondary-button" disabled={cargando}>
              {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button onClick={logoutAdmin} className="secondary-button">Salir</button>
          </div>
        )}
      </header>

      {!hasSecret ? (
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, maxWidth:420 }}>
          <input
            type="password"
            placeholder="Contraseña Admin"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              flex:1, padding:10, border:'1px solid #2b2e3d', borderRadius:10,
              background:'rgba(255,255,255,.06)', color:'#e9edf5',
            }}
          />
          <button onClick={loginAdmin} className="primary-button">Ingresar</button>
        </div>
      ) : (
        <p style={{ color:'green', marginTop:0 }}>Sesión admin activa</p>
      )}

      {error && <p style={{ color:'salmon', marginTop:8 }}>{error}</p>}
      {cargando && <p>Cargando…</p>}

      {hasSecret && !cargando && solicitudes.length === 0 && !error && (
        <p>No hay solicitudes pendientes.</p>
      )}

      {hasSecret && solicitudes.length > 0 && (
        <div className="card-svk" style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:8 }}>ID</th>
                <th style={{ textAlign:'left', padding:8 }}>Nombre</th>
                <th style={{ textAlign:'left', padding:8 }}>Teléfono</th>
                <th style={{ textAlign:'left', padding:8 }}>Foto</th>
                <th style={{ textAlign:'left', padding:8 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((u) => (
                <tr key={u.id} style={{ borderTop:'1px solid #2b2e3d' }}>
                  <td style={{ padding:8 }}>{u.id}</td>
                  <td style={{ padding:8 }}>{u.nombre}</td>
                  <td style={{ padding:8 }}>{u.telefono}</td>
                  <td style={{ padding:8 }}>
                    {u.fotoUrl ? (
                      <img src={`${API}${u.fotoUrl}`} alt="foto" width={40} height={40}
                           style={{ objectFit:'cover', borderRadius:6 }} />
                    ) : '—'}
                  </td>
                  <td style={{ padding:8, display:'flex', gap:8 }}>
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
