// E:\SVKP1\frontend\src\pages\Usuario\TiendasSeguidas.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import {
  FiSearch, FiExternalLink, FiGlobe, FiMapPin, FiUsers, FiHeart
} from 'react-icons/fi';
import './usuario.css';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = RAW_API.replace(/\/$/, '');
const FOLLOW_KEY = 'stores_following';

const toPublicUrl = (u) => {
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${API}${u}`;
  return `${API}/${u}`;
};
const storeKey = (t) => t?.slug || t?.publicUuid || String(t?.id || '');
const internalPathForStore = (t) => (t?.slug ? `/t/${encodeURIComponent(t.slug)}` : '');
const externalUrlForStore  = (t) => t?.urlPublica || t?.urlPrincipal || t?.web || t?.url || '';

export default function TiendasSeguidas() {
  const navigate = useNavigate();

  // UI
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('relevance'); // relevance | name | followers | city
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  // Data
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);

  // Follow state (persistente)
  const [usuario, setUsuario] = useState(null);
  const [following, setFollowing] = useState(new Set());
  const persistTimer = useRef(null);

  const usesHashRouter = typeof window !== 'undefined' && window.location.hash.startsWith('#/');

  // === Usuario & suscripciones
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || 'null');
      if (u) {
        setUsuario(u);
        hydrateFollowingFromUser(u);
      }
    } catch {}
    (async () => {
      try {
        const uLS = JSON.parse(localStorage.getItem('usuario') || 'null');
        if (!uLS?.id) return;
        const r = await fetch(`${API}/api/usuarios/${uLS.id}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!data?.usuario) return;
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        setUsuario(data.usuario);
        hydrateFollowingFromUser(data.usuario);
      } catch {}
    })();
  }, []);

  function hydrateFollowingFromUser(u) {
    try {
      let src = u?.suscripciones;
      if (typeof src === 'string') { try { src = JSON.parse(src); } catch {} }
      let arr = [];
      if (Array.isArray(src)) arr = src;
      else if (src && typeof src === 'object') arr = src.tiendas || src.following || src.stores || [];
      if (!arr?.length) arr = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]');
      const keys = (arr || []).map(String).filter(Boolean);
      setFollowing(new Set(keys));
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(keys));
    } catch {
      const localArr = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]');
      setFollowing(new Set(localArr));
    }
  }

  function persistFollowingDebounced(nextSet) {
    const arr = [...nextSet];
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(arr));
    if (!usuario?.id) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(async () => {
      try {
        let r = await fetch(`${API}/api/usuarios/${usuario.id}/suscripciones`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suscripciones: arr })
        });
        if (!r.ok) {
          r = await fetch(`${API}/api/usuarios/${usuario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suscripciones: arr })
          });
        }
        try {
          const data = await r.json();
          if (data?.usuario) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            setUsuario(data.usuario);
          }
        } catch {}
      } catch {}
    }, 300);
  }

  const isFollowing = (t) => {
    const k = storeKey(t);
    return k && following.has(String(k));
  };

  const toggleFollow = (t) => {
    const k = storeKey(t);
    if (!k) return;
    setFollowing((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      persistFollowingDebounced(next);
      return next;
    });
  };

  // === Fetch de tiendas
  const fetchStores = async (signal) => {
    setLoading(true);
    setMsg('');
    const tryEndpoints = [
      `${API}/api/tiendas/search?q=${encodeURIComponent(q)}&page=${page}&limit=24`,
      `${API}/api/tiendas/public?search=${encodeURIComponent(q)}&page=${page}&limit=24`,
      `${API}/api/tiendas?search=${encodeURIComponent(q)}&page=${page}&limit=24`,
      `${API}/api/tienda/search?q=${encodeURIComponent(q)}&page=${page}&limit=24`,
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

  // === Derivados: filtro “solo seguidas” y ordenamiento
  const filtered = useMemo(() => {
    const base = onlyFollowing ? stores.filter((t) => isFollowing(t)) : stores;
    return base;
  }, [stores, onlyFollowing, following]);

  const visibleStores = useMemo(() => {
    let list = filtered;
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((t) => {
        const hay = `${t?.nombre || ''} ${t?.descripcion || ''} ${t?.ciudad || ''} ${t?.categoria || ''}`.toLowerCase();
        return hay.includes(term);
      });
    }
    switch (sort) {
      case 'name':
        list = [...list].sort((a, b) => (a?.nombre || '').localeCompare(b?.nombre || ''));
        break;
      case 'followers':
        list = [...list].sort((a, b) => (b?.seguidores || 0) - (a?.seguidores || 0));
        break;
      case 'city':
        list = [...list].sort((a, b) => (a?.ciudad || '').localeCompare(b?.ciudad || ''));
        break;
      default: // relevance: ya viene del backend por búsqueda, mantenemos orden
        break;
    }
    return list;
  }, [filtered, q, sort]);

  const visitStore = (t) => {
    const internal = internalPathForStore(t);
    const external = externalUrlForStore(t);

    if (internal) {
      if (usesHashRouter) window.location.hash = internal;
      else navigate(internal);
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

      <div className="page page--dark-svk">
        <main className="container-svk">
          {/* Header + controles */}
          <header className="card-svk" style={{ marginBottom: 16 }}>
            <div className="block-title" style={{ marginBottom: 10 }}>
              <span className="icon"><FiSearch /></span>
              <h2>Explorar tiendas</h2>
            </div>
            <p className="subtitle-svk" style={{ marginBottom: 14 }}>
              Descubre tiendas de vendedores. Usa el corazón para seguir tus favoritas.
            </p>

            <div className="shop-controls">
              <div className="shop-searchbar dark">
                <FiSearch />
                <input
                  value={q}
                  onChange={(e) => { setPage(1); setQ(e.target.value); }}
                  placeholder="Buscar por nombre, ciudad o categoría…"
                  aria-label="Buscar tiendas"
                />
              </div>

              <div className="shop-right-controls">
                <label className="toggle small" title="Mostrar solo tiendas que sigues">
                  <input
                    type="checkbox"
                    checked={onlyFollowing}
                    onChange={(e) => setOnlyFollowing(e.target.checked)}
                  />
                  <span>Solo seguidas</span>
                </label>

                <select
                  className="select-svk"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Ordenar resultados"
                >
                  <option value="relevance">Relevancia</option>
                  <option value="name">Nombre (A–Z)</option>
                  <option value="followers">Más seguidas</option>
                  <option value="city">Ciudad (A–Z)</option>
                </select>
              </div>
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
                <div className="card-svk empty-state">
                  <p className="subtitle-svk">
                    {msg || (onlyFollowing
                      ? 'No hay coincidencias entre tus tiendas seguidas.'
                      : 'Sin resultados. Ajusta tu búsqueda.')}
                  </p>
                </div>
              ) : (
                <section className="shop-grid">
                  {visibleStores.map((t, i) => {
                    const logo = toPublicUrl(t?.logoUrl || t?.logo);
                    const hdr = toPublicUrl(t?.portadaUrl || t?.banner);
                    const external = externalUrlForStore(t);
                    const followed = isFollowing(t);

                    return (
                      <article key={`${storeKey(t) || i}`} className="shop-card card-svk shop-card--fx">
                        {/* Portada 16:9 */}
                        <div className="shop-cover" style={hdr ? { backgroundImage: `url(${hdr})` } : undefined} />

                        <div className="shop-body">
                          {/* Cabecera */}
                          <div className="shop-head">
                            <div className="shop-avatar">
                              {logo ? <img src={logo} alt="" /> : <span className="shop-avatar-fallback">SVK</span>}
                            </div>
                            <div className="shop-head-text">
                              <h3 className="shop-name">{t?.nombre || 'Tienda sin nombre'}</h3>
                              <p className="shop-desc">{t?.descripcion || '—'}</p>
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="shop-meta">
                            {t?.ciudad && (<span><FiMapPin /> {t.ciudad}</span>)}
                            {(t?.seguidores != null) && (<span><FiUsers /> {t.seguidores} seguidores</span>)}
                            {t?.categoria && <span className="shop-tag">#{t.categoria}</span>}
                            {followed && <span className="shop-badge">Siguiendo</span>}
                          </div>

                          {/* Acciones */}
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
                              aria-pressed={followed}
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

              {/* Paginación simple (si tu backend pagina) */}
              <div className="pager">
                <button
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <span style={{ color: 'var(--svk-muted)' }}>Página {page}</span>
                <button className="btn btn-ghost" onClick={() => setPage((p) => p + 1)}>
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
