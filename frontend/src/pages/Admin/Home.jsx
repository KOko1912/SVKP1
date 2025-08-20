// frontend/src/pages/Admin/Home.jsx
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const LOCAL_SECRET_KEY = 'admin_secret';
const DEFAULT_SECRET = 'super_admin_123'; // Debe coincidir con ADMIN_SECRET del backend

export default function AdminHome() {
  const [adminPass, setAdminPass] = useState('');
  const [secret, setSecret] = useState(localStorage.getItem(LOCAL_SECRET_KEY) || '');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);

  // Carga solicitudes usando el secret indicado (evita la carrera con setState)
  const cargarSolicitudes = async (sec = secret) => {
    setError('');
    setCargando(true);
    try {
      const res = await fetch(`${API}/api/admin/solicitudes-vendedor`, {
        headers: { 'x-admin-secret': sec || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No autorizado');
      setSolicitudes(data.data || []);
    } catch (e) {
      setError(e.message);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  };

  // Login con contraseña almacenada en tabla SDKADMIN
  const loginAdmin = async () => {
    setError('');
    try {
      if (!adminPass) throw new Error('Ingresa la contraseña de SDKADMIN');

      const res = await fetch(`${API}/api/sdkadmin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error('Contraseña incorrecta');

      // Guarda el secret y úsalo de inmediato
      const SEC = DEFAULT_SECRET;
      localStorage.setItem(LOCAL_SECRET_KEY, SEC);
      setSecret(SEC);

      await cargarSolicitudes(SEC); // ← usa el secret sin esperar al setState
      setAdminPass('');
    } catch (e) {
      setError(e.message);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem(LOCAL_SECRET_KEY);
    setSecret('');
    setSolicitudes([]);
    setAdminPass('');
    setError('');
  };

  useEffect(() => {
    if (secret) cargarSolicitudes(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const accion = async (id, tipo) => {
    setError('');
    try {
      const url = `${API}/api/admin/vendedores/${id}/${tipo}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'x-admin-secret': secret || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `No se pudo ${tipo}`);
      await cargarSolicitudes(secret);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>👑 SystemVkode Administrador</h2>
        {secret ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => cargarSolicitudes(secret)} className="secondary-button">Actualizar</button>
            <button onClick={logoutAdmin} className="secondary-button">Salir</button>
          </div>
        ) : null}
      </header>

      {!secret ? (
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
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={loginAdmin} className="primary-button">
            Ingresar
          </button>
        </div>
      ) : (
        <p style={{ color: 'green', marginTop: 0 }}>Sesión admin activa</p>
      )}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {cargando && <p>Cargando…</p>}

      {secret && !cargando && solicitudes.length === 0 && (
        <p>No hay solicitudes pendientes.</p>
      )}

      {secret && solicitudes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
              <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{u.id}</td>
                <td style={{ padding: 8 }}>{u.nombre}</td>
                <td style={{ padding: 8 }}>{u.telefono}</td>
                <td style={{ padding: 8 }}>
                  {u.fotoUrl
                    ? <img src={`${API}${u.fotoUrl}`} alt="foto" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} />
                    : '—'}
                </td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <button className="primary-button" onClick={() => accion(u.id, 'aprobar')}>Aprobar</button>
                  <button className="secondary-button" onClick={() => accion(u.id, 'rechazar')}>Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
