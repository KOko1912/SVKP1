import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

// URL interna pública (coincide con la que genera Pagina.jsx)
const internalPathForStore = (t) => (t?.slug ? `/t/${encodeURIComponent(t.slug)}` : '');
const externalUrlForStore  = (t) => t?.urlPublica || t?.urlPrincipal || t?.web || t?.url || '';

export default function TiendasSeguidas() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  const usesHashRouter = typeof window !== 'undefined' && window.location.hash.startsWith('#/');

  // seguir/dejar de seguir usando localStorage
  const followingSet = useMemo(() => {
    try {
      const a = JSON.parse(localStorage.getItem('stores_following') || '[]');
      return new Set(a.filter(Boolean));
    } catch {
      return new Set();
    }
  }, []);
  const saveFollowing = (set) => localStorage.setItem('stores_following', JSON.stringify([...set]));

  const isFollowing = (t) => {
    const key = t?.slug || t?.publicUuid || String(t?.id || '');
    return key && followingSet.has(key);
  };
  const toggleFollow = (t) => {
    const key = t?.slug || t?.publicUuid || String(t?.id || '');
    if (!key) return;
    const next = new Set(followingSet);
    next.has(key) ? next.delete(key) : next.add(key);
    saveFollowing(next);
    // fuerza re-render
    setStores((s) => s.map(x => ({ ...x })));
  };

  // fetch con fallback (nuestro endpoint principal es /api/tiendas/search)
  const fetchStores = async (signal) => {
    setLoading(true); setMsg('');
    const tryEndpoints = [
      `${API}/api/tiendas/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`,
      `${API}/api/tiendas/public?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      `${API}/api/tiendas?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      `${API}/api/tienda/search?q=${encodeURIComponent(q)}&page=${page}&limit=20`,
    ];
    for (const url of tryEndpoints) {
      try {
        const r = await fetch(url, { signal });
        if (!r.ok) continue;
        const data = await r.json();
        const list = data?.items || data?.data || data?.tiendas || (Array.isArray(data) ? data : []);
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
    const t = setTimeout(() => fetchStores(ctrl.signal), 250);
    return () => { ctrl.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  const visibleStores = onlyFollowing ? stores.filter(t => isFollowing(t)) : stores;

  const visitStore = (t) => {
    const internal = internalPathForStore(t);  // -> "/t/:slug"
    const external = externalUrlForStore(t);

    if (internal) {
      if (usesHashRouter) {
        window.location.hash = internal;       // "#/t/:slug"
      } else {
        navigate(internal);                    // "/t/:slug"
      }
    } else if (external) {
      window.open(external, '_blank', 'noopener,noreferrer');
    } else if (t?.slug) {
      const p = usesHashRouter ? `#/t/${t.slug}` : `/t/${t.slug}`;
      usesHashRouter ? (window.location.hash = p) : navigate(p);
    } else {
      alert('Esta tienda aún no tiene URL pública.');
    }
  };

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
            <div className="shop-searchbar" style={{ gap: 12 }}>
              <FiSearch />
              <input
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                placeholder="Buscar por nombre, alias, referencia o ciudad…"
                aria-label="Buscar tiendas"
              />
              <label className="toggle small" title="Mostrar solo tiendas que sigo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={onlyFollowing}
                  onChange={(e) => setOnlyFollowing(e.target.checked)}
                />
                <span>Solo seguidas</span>
              </label>
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
              {!visibleStores.length ? (
                <div className="empty-state card">
                  <p>{msg || 'Sin resultados.'}</p>
                </div>
              ) : (
                <section className="shop-grid">
                  {visibleStores.map((t, i) => {
                    const logo = toPublicUrl(t?.logoUrl || t?.logo);
                    const hdr = toPublicUrl(t?.portadaUrl || t?.banner);
                    const external = externalUrlForStore(t);
                    const followed = isFollowing(t);
                    return (
                      <article key={`${t.id || t.slug || i}`} className="shop-card card">
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
                            {t?.ciudad && (<span><FiMapPin /> {t.ciudad}</span>)}
                            {(t?.seguidores != null) && (<span><FiUsers /> {t.seguidores} seguidores</span>)}
                            {t?.categoria && <span>#{t.categoria}</span>}
                          </div>

                          <div className="shop-actions">
                            <button
                              className="btn btn-outline"
                              onClick={() => visitStore(t)}
                              title="Abrir sitio público de la tienda"
                            >
                              {external ? <FiExternalLink /> : <FiGlobe />} Visitar tienda
                            </button>

                            <button
                              className={`btn btn-ghost ${followed ? 'active' : ''}`}
                              onClick={() => toggleFollow(t)}
                              title={followed ? 'Dejar de seguir' : 'Seguir tienda'}
                            >
                              <FiHeart /> {followed ? 'Siguiendo' : 'Seguir'}
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
