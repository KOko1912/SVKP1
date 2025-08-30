import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBarUsuario from './NavBarUsuario';
import { FiSearch, FiExternalLink, FiGlobe, FiMapPin, FiUsers, FiHeart } from 'react-icons/fi';
import './usuario.css';
import './TiendasSeguidas.css';

const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API = RAW_API.replace(/\/$/, '');
const FOLLOW_KEY = 'stores_following';
const ENABLE_EXPLORE = String(import.meta.env.VITE_ENABLE_STORE_EXPLORE || '').toLowerCase() === 'true';

/* ================= Helpers ================= */
const tryJson = async (url, init) => {
  try {
    const r = await fetch(url, init);
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok || (typeof data === 'object' && data?.error)) return null;
    return data;
  } catch { return null; }
};

// Public URL (Supabase absoluta o ruta de backend)
const toPublicUrl = (u) => {
  if (!u || typeof u !== 'string') return '';
  const s = u.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return `${API}${s}`;
  return `${API}/${s}`;
};
const withCacheBuster = (url, stamp = Date.now()) =>
  url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp}` : '';

// Imagen/branding
const pickStoreLogo = (t) =>
  t?.logo?.url || t?.branding?.logo?.url || t?.logoUrl || (typeof t?.logo === 'string' ? t.logo : '') || '';
const pickStoreCover = (t) =>
  t?.portada?.url || t?.banner?.url || t?.branding?.portada?.url || t?.branding?.banner?.url || t?.portadaUrl || t?.banner || '';
const externalUrlForStore  = (t) => t?.urlPublica || t?.urlPrincipal || t?.web || t?.url || '';
const storeKey = (t) => t?.slug || t?.publicUuid || String(t?.id || '');
const internalPathForStore = (t) => t?.slug ? `/t/${encodeURIComponent(t.slug)}` : (t?.publicUuid ? `/s/${encodeURIComponent(t.publicUuid)}` : '');

// Branding helpers
const HEX_RE = /#([0-9a-f]{6})/ig;
const safeColorsFromGradient = (g) => {
  if (typeof g !== 'string') return null;
  const m = g.match(HEX_RE);
  if (!m || m.length < 2) return null;
  return { from: m[0], to: m[1] };
};
const hashPick = (seed = 'svk') => {
  const pools = [
    ['#6d28d9', '#c026d3'], // purple
    ['#0369a1', '#0ea5e9'], // blue
    ['#059669', '#10b981'], // green
    ['#ea580c', '#f97316'], // orange
    ['#be185d', '#ec4899'], // pink
    ['#0e7490', '#06b6d4'], // cyan
    ['#b91c1c', '#ef4444'], // red
  ];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const idx = h % pools.length;
  return { from: pools[idx][0], to: pools[idx][1] };
};
const pickBrand = (t) => {
  const g = t?.colorPrincipal || t?.branding?.colorPrincipal;
  const parsed = safeColorsFromGradient(g);
  if (parsed) return parsed;
  const seed = t?.slug || t?.publicUuid || String(t?.id || 'svk');
  return hashPick(seed);
};

/* ========= resolver tienda por clave ========= */
async function fetchPublicStoreByKey(key) {
  if (!key) return null;
  const k = String(key).trim();
  let d = await tryJson(`${API}/api/tienda/public/${encodeURIComponent(k)}`);
  if (d && (d.slug || d.id)) return d;
  d = await tryJson(`${API}/api/tienda/public/uuid/${encodeURIComponent(k)}`);
  if (d && (d.slug || d.id)) return d;
  if (/^\d+$/.test(k)) {
    d = await tryJson(`${API}/api/tienda/public/by-id/${k}`);
    if (d && (d.slug || d.id)) return d;
  }
  return null;
}

/* ============================= Página ============================= */
export default function TiendasSeguidas() {
  const navigate = useNavigate();

  // UI
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('relevance');
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  // Data
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);

  // Follow state
  const [usuario, setUsuario] = useState(null);
  const [following, setFollowing] = useState(new Set());
  const persistTimer = useRef(null);

  const usesHashRouter = typeof window !== 'undefined' && window.location.hash.startsWith('#/');

  /* ============== Usuario y suscripciones ============== */
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

  /* ====================== Fetch principal ====================== */
  const fetchStores = async (signal) => {
    setLoading(true);
    setMsg('');
    const results = [];
    const term = q.trim();

    if (term) {
      const resolved = await fetchPublicStoreByKey(term);
      if (resolved) {
        results.push(resolved);
        setStores(results);
        setLoading(false);
        return;
      }
      // Si tienes un buscador de texto completo, actívalo con VITE_ENABLE_STORE_EXPLORE=true
      if (ENABLE_EXPLORE) {
        const extra = await tryJson(`${API}/api/tiendas/search?q=${encodeURIComponent(term)}&page=${page}&limit=48`, { signal });
        const list = extra?.items || extra?.data || extra?.tiendas || (Array.isArray(extra) ? extra : []);
        if (Array.isArray(list) && list.length) {
          setStores(list);
          setLoading(false);
          return;
        }
      }
      setStores([]);
      setMsg('No se encontraron tiendas para esa clave.');
      setLoading(false);
      return;
    }

    // sin término: seguidas + me
    const followArr = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]');
    if (Array.isArray(followArr) && followArr.length) {
      const batch = await Promise.allSettled(followArr.map(k => fetchPublicStoreByKey(k)));
      for (const it of batch) if (it.status === 'fulfilled' && it.value) results.push(it.value);
    }

    try {
      const uLS = JSON.parse(localStorage.getItem('usuario') || 'null');
      const headers = uLS?.id ? { 'x-user-id': uLS.id } : undefined;
      const me = await tryJson(`${API}/api/tienda/me`, { headers, signal });
      if (me && (me.isPublished || me.slug)) results.push(me);
    } catch {}

    // si existe listado público, úsalo (opt-in)
    if (ENABLE_EXPLORE) {
      const opts = [
        `${API}/api/tiendas/public?page=${page}&limit=48`,
        `${API}/api/tiendas?page=${page}&limit=48`
      ];
      for (const url of opts) {
        const d = await tryJson(url, { signal });
        const list = d?.items || d?.data || d?.tiendas || (Array.isArray(d) ? d : null);
        if (Array.isArray(list) && list.length) results.push(...list);
      }
    }

    // De-duplicar (por slug o id)
    const seen = new Set();
    const uniq = [];
    for (const t of results) {
      const key = t?.slug || `id:${t?.id}`;
      if (key && !seen.has(key)) { seen.add(key); uniq.push(t); }
    }

    setStores(uniq);
    setMsg(uniq.length ? '' : 'Aún no sigues tiendas. Busca por slug y pulsa “Seguir”.');
    setLoading(false);
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => fetchStores(ctrl.signal), 180);
    return () => { ctrl.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  /* ====================== Derivados y UI ====================== */
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
        return hay.includes(term) || (t?.slug || '').toLowerCase().includes(term);
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
      default:
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
          <header className="ts-card card-svk" style={{ marginBottom: 16 }}>
            <div className="block-title" style={{ marginBottom: 10 }}>
              <span className="icon"><FiSearch /></span>
              <h2>Explorar / Tiendas seguidas</h2>
            </div>
            <p className="subtitle-svk" style={{ marginBottom: 14 }}>
              Escribe el <strong>slug</strong> de una tienda para buscarla, o descubre nuevas tiendas.
            </p>

            <div className="ts-controls">
              <div className="ts-searchbar">
                <FiSearch />
                <input
                  value={q}
                  onChange={(e) => { setPage(1); setQ(e.target.value); }}
                  placeholder="Buscar por SLUG, UUID o ID… (ej. tiendasonline)"
                  aria-label="Buscar tiendas"
                />
              </div>

              <div className="ts-right-controls">
                <label className="ts-toggle" title="Mostrar solo tiendas que sigues">
                  <input
                    type="checkbox"
                    checked={onlyFollowing}
                    onChange={(e) => setOnlyFollowing(e.target.checked)}
                  />
                  <span>Solo seguidas</span>
                </label>

                <select
                  className="ts-select"
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
            <section className="ts-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <article key={i} className="ts-card ts-skeleton" />
              ))}
            </section>
          ) : (
            <>
              {!visibleStores.length ? (
                <div className="ts-card empty-state">
                  <p className="subtitle-svk">{msg}</p>
                </div>
              ) : (
                <section className="ts-grid">
                  {visibleStores.map((t, i) => {
                    const logoRaw = pickStoreLogo(t);
                    const coverRaw = pickStoreCover(t);
                    const stamp = t?.updatedAt || Date.now();
                    const logo = withCacheBuster(toPublicUrl(logoRaw), stamp);
                    const hdr  = withCacheBuster(toPublicUrl(coverRaw), stamp);
                    const followed = isFollowing(t);
                    const { from, to } = pickBrand(t);

                    return (
                      <article
                        key={`${storeKey(t) || i}`}
                        className="ts-card ts-shop"
                        style={{ '--from': from, '--to': to }}
                      >
                        <div className="ts-accent" />
                        <div
                          className="ts-cover"
                          style={hdr ? { backgroundImage: `url(${hdr})` } : { backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
                        >
                          <div className="ts-cover-overlay" />
                        </div>

                        <div className="ts-body">
                          <div className="ts-head">
                            <div className="ts-avatar">
                              {logo ? <img src={logo} alt="" /> : <span className="ts-avatar-fallback">SVK</span>}
                            </div>
                            <div className="ts-head-text">
                              <h3 className="ts-name">{t?.nombre || 'Tienda sin nombre'}</h3>
                              <p className="ts-desc">{t?.descripcion || '—'}</p>
                            </div>
                          </div>

                          <div className="ts-meta">
                            {t?.ciudad && (<span><FiMapPin /> {t.ciudad}</span>)}
                            {(t?.seguidores != null) && (<span><FiUsers /> {t.seguidores} seguidores</span>)}
                            {t?.categoria && <span className="ts-tag">#{t.categoria}</span>}
                            {followed && <span className="ts-badge">Siguiendo</span>}
                          </div>

                          <div className="ts-actions">
                            <button className="btn btn-outline" onClick={() => visitStore(t)} title="Abrir sitio público de la tienda">
                              {externalUrlForStore(t) ? <FiExternalLink /> : <FiGlobe />} Visitar tienda
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

              <div className="pager">
                <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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
