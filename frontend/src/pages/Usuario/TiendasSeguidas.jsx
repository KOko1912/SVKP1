import { useEffect, useMemo, useState } from 'react';
import NavBarUsuario from './NavBarUsuario';
import {
  FiSearch, FiExternalLink, FiGlobe, FiMapPin, FiUsers, FiHeart
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = RAW_API.replace(/\/$/, '');

// helpers
const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API}${u}`;
  return `${API}/${u}`;
};
const pickStoreUrl = (t) =>
  t?.urlPublica || t?.urlPrincipal || t?.web || t?.url || '';

export default function TiendasSeguidas() {
  const [q, setQ] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);

  // simulamos “tiendas que sigo” vía localStorage si lo ocupas luego
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; }
  }, []);

  // fetch con fallback de endpoint (cada backend lo nombra distinto)
  const fetchStores = async (signal) => {
    setLoading(true); setMsg('');
    const tryEndpoints = [
      `${API}/api/tiendas/public?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      `${API}/api/tiendas?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      `${API}/api/tienda/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`,
    ];

    for (const url of tryEndpoints) {
      try {
        const r = await fetch(url, { signal });
        if (!r.ok) continue;
        const data = await r.json();
        const list =
          data?.items || data?.data || data?.tiendas || Array.isArray(data) ? data : [];
        if (Array.isArray(list)) {
          setStores(list);
          setLoading(false);
          return;
        }
      } catch (e) {
        if (signal?.aborted) return;
      }
    }
    setStores([]);
    setMsg('No se encontraron tiendas.');
    setLoading(false);
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => fetchStores(ctrl.signal), 280); // debounce sutil
    return () => { ctrl.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  return (
    <>
      <NavBarUsuario />

      <div className="page page--light">
        <main className="container">
          {/* Encabezado y buscador */}
          <header className="shop-search-header card">
            <div>
              <h1 className="title">Tiendas</h1>
              <p className="subtitle">
                Descubre tiendas creadas por vendedores. Puedes visitarlas aunque no tengas cuenta.
              </p>
            </div>
            <div className="shop-searchbar">
              <FiSearch />
              <input
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                placeholder="Buscar por nombre, categoría o ciudad…"
                aria-label="Buscar tiendas"
              />
            </div>
          </header>

          {/* Resultados */}
          {loading ? (
            <section className="shop-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <article key={i} className="shop-card skeleton" />
              ))}
            </section>
          ) : (
            <>
              {!stores.length ? (
                <div className="empty-state card">
                  <p>{msg || 'Sin resultados.'}</p>
                </div>
              ) : (
                <section className="shop-grid">
                  {stores.map((t, i) => {
                    const logo = toPublicUrl(t?.logoUrl || t?.logo);
                    const hdr = toPublicUrl(t?.portadaUrl || t?.banner);
                    const url = pickStoreUrl(t);
                    return (
                      <article key={`${t.id || i}`} className="shop-card card">
                        {hdr ? <div className="shop-cover" style={{ backgroundImage: `url(${hdr})` }} /> : <div className="shop-cover" />}
                        <div className="shop-body">
                          <div className="shop-head">
                            <div className="shop-avatar">
                              {logo ? <img src={logo} alt="" /> : <span className="shop-avatar-fallback">SVK</span>}
                            </div>
                            <div>
                              <h3 className="shop-name">{t?.nombre || 'Tienda sin nombre'}</h3>
                              <p className="shop-desc">{t?.descripcion || '—'}</p>
                            </div>
                          </div>

                          <div className="shop-meta">
                            {t?.ciudad && (
                              <span><FiMapPin /> {t.ciudad}</span>
                            )}
                            {(t?.seguidores != null) && (
                              <span><FiUsers /> {t.seguidores} seguidores</span>
                            )}
                            {t?.categoria && <span>#{t.categoria}</span>}
                          </div>

                          <div className="shop-actions">
                            <button
                              className="btn btn-outline"
                              onClick={() => {
                                const dest = url || `${window.location.origin}/#/${t?.slug || ''}`;
                                window.open(dest, '_blank', 'noopener,noreferrer');
                              }}
                              title="Abrir sitio público de la tienda"
                            >
                              {url ? <FiExternalLink /> : <FiGlobe />} Visitar tienda
                            </button>

                            <button
                              className="btn btn-ghost"
                              onClick={() => alert('(Demo) Seguir tienda')}
                              title="Seguir tienda (demo)"
                            >
                              <FiHeart /> Seguir
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}

              {/* Paginación simple */}
              <div className="pager">
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Anterior
                </button>
                <span>Página {page}</span>
                <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)}>
                  Siguiente
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
