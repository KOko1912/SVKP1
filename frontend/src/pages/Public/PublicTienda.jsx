// frontend/src/pages/Public/PublicTienda.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const toPublicUrl = (u) =>
  !u ? '' : /^https?:\/\//i.test(u) ? u : `${API}${u.startsWith('/') ? '' : '/'}${u}`;
const withT = (url, t = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${t}` : '';

export default function PublicTienda() {
  const { slugUuid } = useParams();
  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/public/tienda/${encodeURIComponent(slugUuid)}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'No se pudo cargar la tienda');
        setTienda(d.tienda);
        setProductos(d.productos || []);
      } catch {
        setTienda(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slugUuid]);

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (!tienda) return <div style={{ padding: 24 }}>La tienda no existe o no está publicada.</div>;

  const portada = withT(toPublicUrl(tienda.portadaUrl || ''));
  const logo = withT(toPublicUrl(tienda.logoUrl || ''));

  return (
    <div style={{ background: '#ffffff', color: '#0f172a', minHeight: '100vh' }}>
      {/* Header limpio, blanco/pro */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            padding: '20px 16px',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #e2e8f0',
              background: '#f1f5f9',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt="logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 28 }}>🛍️</span>
            )}
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{tienda.nombre}</h1>
            {tienda.descripcion && (
              <p style={{ margin: '6px 0 0', color: '#475569' }}>{tienda.descripcion}</p>
            )}
          </div>
        </div>

        {portada && (
          <div
            style={{
              width: '100%',
              height: 220,
              backgroundImage: `url(${portada})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderTop: '1px solid #e5e7eb',
            }}
          />
        )}
      </header>

      {/* Grid de productos limpio/blanco */}
      <main style={{ maxWidth: 1080, margin: '16px auto', padding: '0 16px' }}>
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {productos.map((p) => {
            const img = p.imagen_url ? withT(toPublicUrl(p.imagen_url), p.updated_at || Date.now()) : '';
            return (
              <article
                key={p.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '100%', aspectRatio: '4/3', background: '#f8fafc' }}>
                  {img ? (
                    <img
                      src={img}
                      alt={p.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : null}
                </div>
                <div style={{ padding: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{p.nombre}</h3>
                  {p.precio != null && (
                    <div style={{ marginTop: 6, fontWeight: 800 }}>
                      ${Number(p.precio).toFixed(2)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {!productos.length && (
            <p style={{ color: '#64748b' }}>Aún no hay productos publicados.</p>
          )}
        </section>
      </main>
    </div>
  );
}
