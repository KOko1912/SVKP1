// frontend/src/pages/Vendedor/ConfiguracionVista.jsx
// Editor de vista 6x20 – responsive y con branding consistente con Perfil

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Nabvendedor from './Nabvendedor';
import {
  Responsive as ResponsiveGridLayout,
  WidthProvider
} from 'react-grid-layout';
import {
  FiPlus, FiSave, FiRefreshCcw, FiSettings, FiTrash2, FiCopy,
  FiImage, FiLayers, FiStar, FiGrid, FiPackage, FiList, FiLayout,
  FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2, FiMove,
  FiX, FiSliders
} from 'react-icons/fi';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './ConfigVista.css';

// Branding util (mismos tokens que Perfil)
import { applyBrandTheme, refreshOverlayForMode } from '../../lib/brandTheme';

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

const API   = (import.meta.env.VITE_API_URL    || 'http://localhost:5000').replace(/\/$/, '');
const FILES = (import.meta.env.VITE_FILES_BASE || API).replace(/\/$/, '');

/* ========================= */
/* Definición de bloques     */
/* ========================= */
const BLOCKS = [
  { type: 'hero',     icon: <FiImage/>,   name: 'Portada (Hero)',        w: 6, h: 4, minW: 4,  minH: 3 },
  { type: 'featured', icon: <FiStar/>,    name: 'Productos destacados',  w: 4, h: 3, minW: 4,  minH: 2 },
  { type: 'grid',     icon: <FiGrid/>,    name: 'Todos los productos',   w: 6, h: 4, minW: 6,  minH: 3 },
  { type: 'category', icon: <FiList/>,    name: 'Categoría + productos', w: 4, h: 3, minW: 4,  minH: 2 },
  { type: 'product',  icon: <FiPackage/>, name: 'Producto individual',   w: 2, h: 3, minW: 2,  minH: 2 },
  { type: 'banner',   icon: <FiLayers/>,  name: 'Banner promocional',    w: 6, h: 3, minW: 4,  minH: 2 },
  { type: 'logo',     icon: <FiImage/>,   name: 'Logo',                  w: 2, h: 4, minW: 2,  minH: 2 },
];

const DEFAULT_PROPS = {
  hero:     { showLogo: true, showDescripcion: true, align: 'center' },
  featured: { title: 'Destacados', limit: 8 },
  grid:     { title: 'Todos los productos', limit: 12, showFilter: true },
  category: { title: '', categoriaId: null, limit: 12, showFilter: true },
  product:  { productoId: null },
  banner:   { title: 'Promoción', ctaText: 'Ver más', ctaUrl: '' },
  logo:     { shape: 'rounded', frame: 'thin' },
};

/* ========================= */
/* Helpers                   */
/* ========================= */
const uid = () => { try { return crypto.randomUUID().slice(0,8); } catch { return Math.random().toString(36).slice(2,10); } };
const toPublicUrl = (u) => {
  if (!u) return '';
  if (Array.isArray(u)) return toPublicUrl(u.find(Boolean));
  if (typeof u === 'object') return toPublicUrl(u.url || u.path || u.src || u.image || u.filepath || '');
  const s = String(u).replace(/\\/g, '/').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/uploads') || s.startsWith('/TiendaUploads') || s.startsWith('/files')) return `${FILES}${s}`;
  if (s.startsWith('/')) return `${API}${s}`;
  return s;
};
const labelBlock = (type) => ({
  hero: 'Portada (Hero)',
  featured: 'Productos destacados',
  grid: 'Todos los productos',
  category: 'Categoría + productos',
  product: 'Producto',
  banner: 'Banner',
  logo: 'Logo',
}[type] || 'Bloque');
const safeParse = (txt, fallback = null) => { try { return JSON.parse(txt); } catch { return fallback; } };
const extractColors = (gradientString) => {
  const m = String(gradientString||'').match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' };
};

/* ========================= */
/* Componente principal      */
/* ========================= */
export default function ConfiguracionVista(){
  // Modo de color coherente con Perfil
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('vk-color-mode') || (prefersLight ? 'light' : 'dark'));

  // Auth y llaves
  const usuario = useMemo(() => { try { return JSON.parse(localStorage.getItem('usuario')||'{}'); } catch { return {}; } }, []);
  const token = localStorage.getItem('token');
  const headers = { ...(usuario?.id? {'x-user-id':usuario.id}:{}), ...(token? {Authorization:`Bearer ${token}`}:{}) };
  const headersJson = { ...headers, 'Content-Type': 'application/json' };
  const localKey = useMemo(()=>`homeLayout_${usuario?.id || 'anon'}`,[usuario?.id]);

  // Datos remotos
  const [tienda, setTienda] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);

  // Editor
  const [items, setItems] = useState([]); // [{i,id,type,props,z,x,y,w,h,minW,minH}]
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Drawers en móvil
  const [leftOpen, setLeftOpen]   = useState(false); // Bloques/Acciones
  const [propsOpen, setPropsOpen] = useState(false); // Propiedades

  const undoStack = useRef([]);   // array de snapshots (string)
  const redoStack = useRef([]);   // array de snapshots (string)
  const layoutRef = useRef([]);   // último layout de RGL
  const toastTimer = useRef(null);

  /* ---------------- Carga inicial + branding ---------------- */
  useEffect(() => {
    document.body.classList.add('vendor-theme');
    return () => document.body.classList.remove('vendor-theme');
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
    localStorage.setItem('vk-color-mode', colorMode);
    refreshOverlayForMode(colorMode);
  }, [colorMode]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const rt = await fetch(`${API}/api/tienda/me`, { headers, signal: ac.signal });
        const dt = await rt.json().catch(()=> ({}));
        setTienda(dt || {});
        // Aplica tema de marca (mismos tokens que Perfil)
        applyBrandTheme(dt, { persist: false });

        const qs = dt?.id ? `?tiendaId=${dt.id}` : '';
        const rc = await fetch(`${API}/api/v1/categorias${qs}`, { headers, signal: ac.signal });
        setCategorias(await rc.json().catch(()=>[]));

        const rp = await fetch(`${API}/api/v1/productos${qs}`, { headers, signal: ac.signal });
        const dp = await rp.json().catch(()=>[]);
        setProductos(Array.isArray(dp?.items)? dp.items : Array.isArray(dp)? dp : []);

        // Layout desde BD o local
        let rawStored = dt?.homeLayout ?? localStorage.getItem(localKey);
        let stored = typeof rawStored === 'string' ? safeParse(rawStored, null) : rawStored;
        let blocks = [];
        if (Array.isArray(stored)) blocks = stored;
        else if (stored?.blocks) blocks = stored.blocks;
        if (!blocks.length) blocks = [ mk('grid', DEFAULT_PROPS.grid, { x:0,y:0,w:6,h:4 }) ];
        const prepared = assignIds(blocks).map(b => toRGLItem(b));
        setItems(prepared);
        // primer snapshot para undo
        undoStack.current = [JSON.stringify(prepared)];
        redoStack.current = [];
      } catch {
        const fallback = [ mk('grid', DEFAULT_PROPS.grid, { x:0,y:0,w:6,h:4 }) ];
        const prepared = assignIds(fallback).map(b => toRGLItem(b));
        setItems(prepared);
        undoStack.current = [JSON.stringify(prepared)];
        redoStack.current = [];
      }
    })();
    return () => ac.abort();
  }, []);

  /* ---------------- Undo/Redo ---------------- */
  const snapshot = useCallback((arr) => JSON.stringify(arr), []);
  const pushHistory = useCallback((nextArr) => {
    const snap = snapshot(nextArr);
    const last = undoStack.current[undoStack.current.length - 1];
    if (snap !== last) {
      undoStack.current.push(snap);
      if (undoStack.current.length > 80) undoStack.current.shift();
    }
    redoStack.current = [];
  }, [snapshot]);

  const undo = () => {
    if (undoStack.current.length < 2) return;
    const curr = undoStack.current.pop(); // quita actual
    redoStack.current.push(curr);
    const prev = undoStack.current[undoStack.current.length - 1];
    setItems(JSON.parse(prev));
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    setItems(JSON.parse(next));
  };

  useEffect(() => {
    const onKey = (e) => {
      const targetIsInput = ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);
      // Borrar bloque seleccionado
      if (!targetIsInput && selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleRemove(selectedId);
      }
      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      // Duplicar
      if (!targetIsInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedId) handleDuplicate(selectedId);
      }
      // Escape: deseleccionar y cerrar drawers
      if (e.key === 'Escape') {
        setSelectedId(null);
        setLeftOpen(false);
        setPropsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  /* ---------------- Layout helpers ---------------- */
  const toRGLItem = (b) => ({
    i: b.id,
    id: b.id,
    type: b.type,
    props: b.props ?? DEFAULT_PROPS[b.type] ?? {},
    z: Number.isFinite(+b.z) ? +b.z : 1,
    x: b.gs?.x ?? 0,
    y: b.gs?.y ?? 0,
    w: clampSize(b.type, b.gs?.w ?? (BLOCKS.find(x=>x.type===b.type)?.w||4)).w,
    h: clampSize(b.type, b.gs?.h ?? (BLOCKS.find(x=>x.type===b.type)?.h||3)).h,
    minW: BLOCKS.find(x=>x.type===b.type)?.minW || 1,
    minH: BLOCKS.find(x=>x.type===b.type)?.minH || 1,
    static: false
  });

  const clampSize = (type, size) => {
    const def = BLOCKS.find(b=>b.type===type) || {};
    return {
      w: Math.max(def.minW||1, Math.min(def.w||6, size||def.w||3)),
      h: Math.max(def.minH||1, Math.min(def.h||4, size||def.h||3))
    };
  };

  const mk = (type, props, gs) => {
    const def = BLOCKS.find(b=>b.type===type)||{};
    return {
      id:`${type}-${uid()}`,
      type,
      props: props ?? DEFAULT_PROPS[type] ?? {},
      z: 1,
      gs:{ w:def.w, h:def.h, minW:def.minW, minH:def.minH, x:0,y:0, ...(gs||{}) }
    };
  };

  const assignIds = (arr) => (arr||[]).map((b,i)=> ({ ...b, id: b.id || `${b.type}-${uid()}`, z: (b.z!=null ? b.z : (i+1)) }));

  const paletteAdd = (type) => {
    const def = BLOCKS.find(b=>b.type===type) || { w:4, h:3, minW:2, minH:2 };
    const base = toRGLItem(mk(type, DEFAULT_PROPS[type], { w:def.w, h:def.h }));
    setItems(prev => {
      const next = [ ...prev, { ...base, y: Infinity } ];
      pushHistory(next);
      return next;
    });
    setSelectedId(base.i);
    setMsg('Bloque agregado');
    setTimeout(()=>setMsg(''), 1400);
  };

  const handleRemove = (id) => {
    setItems(prev => {
      const next = prev.filter(it => it.i !== id);
      pushHistory(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
    toast('Bloque eliminado');
  };

  const handleDuplicate = (id) => {
    setItems(prev => {
      const it = prev.find(x=>x.i===id); if (!it) return prev;
      const newId = `${it.type}-${uid()}`;
      const copy = { ...it, i: newId, id: newId, x: (it.x+1)%6, y: it.y, z: (it.z||1)+1 };
      const next = [...prev, copy];
      pushHistory(next);
      return next;
    });
    setMsg('Bloque duplicado');
    setTimeout(()=>setMsg(''), 1400);
  };

  const mapLayoutToItems = useCallback((layout, prev) => {
    return prev.map(it => {
      const l = layout.find(x => x.i === it.i);
      return l ? { ...it, x: l.x, y: l.y, w: l.w, h: l.h } : it;
    });
  }, []);

  const onLayoutChange = (layout /* array de {x,y,w,h,i} */) => {
    layoutRef.current = layout;
    setItems(prev => mapLayoutToItems(layout, prev));
  };

  // Guardar una entrada de historial al terminar drag/resize (no en cada pixel)
  const onDragStop   = (layout) => { setItems(prev => { const next = mapLayoutToItems(layout, prev); pushHistory(next); return next; }); };
  const onResizeStop = (layout) => { setItems(prev => { const next = mapLayoutToItems(layout, prev); pushHistory(next); return next; }); };

  /* ---------------- Guardado ---------------- */
  const toast = (m) => {
    setMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=> setMsg(''), 1600);
  };

  const buildPayload = () => ({
    meta: { mode: 'TEMPLATE_6x20' },
    blocks: items.map(it => ({
      id: it.i,
      type: it.type,
      z: it.z,
      props: it.props,
      gs: { x: it.x, y: it.y, w: it.w, h: it.h, minW: it.minW, minH: it.minH }
    }))
  });

  const save = async () => {
    setSaving(true);
    const payload = buildPayload();
    try {
      const r = await fetch(`${API}/api/tienda/me`, { method:'PUT', headers: headersJson, body: JSON.stringify({ homeLayout: payload }) });
      if (!r.ok) {
        localStorage.setItem(localKey, JSON.stringify(payload));
        toast('Guardado local.');
      } else {
        toast('¡Diseño guardado!');
      }
    } catch {
      localStorage.setItem(localKey, JSON.stringify(payload));
      toast('Guardado local (offline).');
    } finally { setSaving(false); }
  };

  const resetLayout = () => {
    const base = assignIds([ mk('grid', DEFAULT_PROPS.grid, { x:0, y:0, w:6, h:4 }) ]).map(b => toRGLItem(b));
    setItems(base);
    pushHistory(base);
    toast('Layout reiniciado');
  };

  const copyJSON = async () => {
    try {
      const data = JSON.stringify(buildPayload(), null, 2);
      await navigator.clipboard?.writeText(data);
      toast('Diseño copiado al portapapeles');
    } catch {
      toast('No se pudo copiar');
    }
  };

  // Autosave suave cada 1.5s después de mover/redimensionar/cambiar props
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(localKey, JSON.stringify(buildPayload()));
    }, 1500);
    return () => clearTimeout(t);
  }, [items]);

  /* ---------------- Render previews ---------------- */
  const Card = ({p}) => {
    const src = toPublicUrl((p?.imagenes?.find(x=>x.isPrincipal)||p?.imagenes?.[0])?.url);
    return (
      <article className="pv-card" aria-label={p?.nombre || 'Producto'}>
        <figure className="pv-card-cover" style={{ backgroundImage: src?`url(${src})`: undefined }} />
        <div className="pv-card-info">
          <h4 className="pv-card-title">{p?.nombre||'Producto'}</h4>
          <div className="pv-card-price">
            {typeof p?.precio==='number' ? `$${Number(p.precio).toFixed(2)}` : <span className="pv-muted">Con variantes</span>}
          </div>
        </div>
      </article>
    );
  };

  const Preview = ({it}) => {
    if (it.type==='hero'){
      const fromTo = extractColors(tienda?.colorPrincipal);
      const bgLayers = [
        `linear-gradient(135deg, ${fromTo.from}c7, ${fromTo.to}c7)`,
        tienda?.portadaUrl ? `url(${toPublicUrl(tienda.portadaUrl)})` : ''
      ].filter(Boolean).join(', ');
      return (
        <div className={`pv-hero align-${it.props.align||'center'}`} style={{ backgroundImage: bgLayers }}>
          {it.props.showLogo && tienda?.logoUrl ? (<img className="pv-hero-logo" src={toPublicUrl(tienda.logoUrl)} alt="logo" />) : null}
          <div className="pv-hero-text">
            <h3>{tienda?.nombre || 'Mi tienda'}</h3>
            {it.props.showDescripcion && tienda?.descripcion ? (<p>{tienda.descripcion}</p>) : null}
          </div>
        </div>
      );
    }
    if (it.type==='featured'){
      const list = (productos||[]).filter(p => p.destacado).slice(0, it.props.limit ?? 8);
      return <div className="pv-grid">{list.length? list.map(p=> <Card key={p.id} p={p}/>) : <div className="pv-empty">Sin destacados</div>}</div>;
    }
    if (it.type==='grid'){
      const itemsG = (productos||[]).slice(0, it.props.limit ?? 12);
      return (
        <div className="pv-stack">
          {it.props.title ? <h4 className="pv-section-title">{it.props.title}</h4> : null}
          <div className="pv-grid">{itemsG.length? itemsG.map(p=> <Card key={p.id} p={p}/>) : <div className="pv-empty">Sin productos</div>}</div>
        </div>
      );
    }
    if (it.type==='category'){
      const catId = it.props.categoriaId ? Number(it.props.categoriaId) : null;
      const itemsC = catId ? (productos||[]).filter(p => Array.isArray(p.categorias) && p.categorias.some(pc => pc.categoriaId === catId)).slice(0, it.props.limit ?? 12) : [];
      const title = it.props.title || (categorias.find(c=>c.id===catId)?.nombre || 'Categoría');
      return (
        <div className="pv-stack">
          <h4 className="pv-section-title">{title}</h4>
          <div className="pv-grid">{itemsC.length? itemsC.map(p=> <Card key={p.id} p={p}/>) : <div className="pv-empty">Selecciona la categoría</div>}</div>
        </div>
      );
    }
    if (it.type==='product'){
      const pid = it.props.productoId ? Number(it.props.productoId) : null;
      const pr = pid ? (productos||[]).find(p => Number(p.id) === pid) : null;
      return pr ? (<div className="pv-grid one"><Card p={pr}/></div>) : (<div className="pv-empty">Selecciona un producto…</div>);
    }
    if (it.type==='banner'){
      const src = toPublicUrl(tienda?.bannerPromoUrl);
      return (
        <div className="pv-banner" style={{ backgroundImage: src?`url(${src})`: undefined }}>
          <div className="pv-banner-content">
            <strong>{it.props.title||'Promoción'}</strong>
            <em>{it.props.ctaText||'Ver más'}</em>
          </div>
        </div>
      );
    }
    if (it.type==='logo'){
      const src = toPublicUrl(tienda?.logoUrl);
      return (
        <div className={`pv-logo pv-${it.props.shape||'rounded'} pv-${it.props.frame||'thin'}`}>
          {src? <img src={src} alt="logo"/> : <div className="pv-empty">Logo</div>}
        </div>
      );
    }
    return null;
  };

  /* ---------------- Prop panel ---------------- */
  const sel = items.find(x=>x.i===selectedId);
  const updateProps = (patch) => {
    setItems(prev => {
      const next = prev.map(x => x.i===selectedId ? ({ ...x, props: { ...x.props, ...patch } }) : x);
      pushHistory(next);
      return next;
    });
  };
  const setLayer = (fn) => setItems(prev => prev.map(x => x.i===selectedId ? ({ ...x, z: fn({ curr: Number(x.z)||1, max: Math.max(1,...prev.map(y=>Number(y.z)||1)) }) }) : x));

  return (
    <div className="vendedor-container">
      <Nabvendedor/>

      {/* Header con overlay seguro y branding */}
      <div
        className="tienda-header"
        style={{
          backgroundImage: tienda?.portadaUrl
            ? `linear-gradient(135deg, var(--brand-from)cc, var(--brand-to)cc), url("${toPublicUrl(tienda.portadaUrl)}")`
            : 'var(--brand-gradient)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'var(--brand-contrast)'
        }}
      >
        <div className="tienda-header-content">
          <div className="tienda-header-info">
            {tienda?.logoUrl ? (
              <img className="tienda-logo" src={toPublicUrl(tienda.logoUrl)} alt="logo" />
            ) : null}
            <div>
              <h1 className="tienda-nombre">{tienda?.nombre || 'Mi tienda'}</h1>
              {tienda?.descripcion ? (<p className="tienda-descripcion">{tienda.descripcion}</p>) : null}
            </div>
          </div>

          {/* Acciones rápidas del header */}
          <div className="header-actions">
            <button
              className="btn btn-ghost"
              onClick={() => setColorMode(m => (m === 'light' ? 'dark' : 'light'))}
              aria-label="Cambiar modo de color"
              title="Claro/Oscuro"
            >
              <FiSliders/> {colorMode === 'light' ? 'Oscuro' : 'Claro'}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <FiSave/>{saving? ' Guardando…' : ' Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Panel principal (3 columnas en desktop; drawers en móvil) */}
      <div className="config-panel builder">
        {/* ----------- Sidebar izquierda: acciones/bloques ----------- */}
        <aside className={`sidebar pv-left ${leftOpen ? 'open' : ''}`}>
          <button className="drawer-close" onClick={() => setLeftOpen(false)} aria-label="Cerrar menú">
            <FiX/>
          </button>

          <div className="form-section">
            <h3><FiLayout/> Plantilla 6×20</h3>
            <div className="form-row">
              <button className="btn btn-primary" onClick={save} disabled={saving}><FiSave/>{saving? ' Guardando…':' Guardar'}</button>
              <button className="btn" onClick={()=>window.location.reload()}><FiRefreshCcw/> Recargar</button>
            </div>
            <div className="form-row">
              <button className="btn" onClick={undo} title="Deshacer (Ctrl/Cmd+Z)"><FiChevronLeft/> Deshacer</button>
              <button className="btn" onClick={redo} title="Rehacer (Ctrl/Cmd+Shift+Z)"><FiChevronRight/> Rehacer</button>
            </div>
            <div className="form-row">
              <button className="btn" onClick={resetLayout} title="Volver al layout base"><FiTrash2/> Reset</button>
              <button className="btn" onClick={copyJSON} title="Copiar JSON del diseño"><FiCopy/> Copiar JSON</button>
            </div>
          </div>

          <div className="form-section">
            <h3><FiPlus/> Bloques</h3>
            {BLOCKS.map(b => (
              <button
                key={b.type}
                className="sidebar-item"
                onClick={()=>paletteAdd(b.type)}
                aria-label={`Agregar bloque ${b.name}`}
              >
                <span className="sidebar-icon">{b.icon}</span>
                <span>{b.name}</span>
                <span className="pv-grow"/>
                <FiPlus/>
              </button>
            ))}
            <div className="sidebar-tip">
              <h4>Tips</h4>
              <p>Arrastra con el mango <FiMove/>. Elimina con <kbd>Del</kbd>, duplica con <kbd>Ctrl/Cmd + D</kbd>.</p>
            </div>
          </div>
        </aside>

        {/* ----------- Lienzo ----------- */}
        <section className="content-area">
          <div className="pv-toolbar">
            <div className="pv-left">
              <button className="btn" onClick={()=>setLeftOpen(true)}><FiLayout/> Bloques</button>
              <button className="btn" onClick={()=>setPropsOpen(true)}><FiSettings/> Propiedades</button>
            </div>
            <div className="pv-right">
              {msg ? <div className="notification show" role="status" aria-live="polite">{msg}</div> : null}
            </div>
          </div>

          <div className="pv-canvas">
            <ResponsiveGrid
              className="layout"
              rowHeight={100}
              isDraggable
              isResizable
              isBounded
              margin={[12,12]}
              containerPadding={[0,0]}
              onLayoutChange={onLayoutChange}
              onDragStop={onDragStop}
              onResizeStop={onResizeStop}
              draggableHandle=".pv-handle"
              breakpoints={{ xl: 1400, lg: 1100, md: 900, sm: 600, xs: 0 }}
              cols={{ xl: 6, lg: 6, md: 6, sm: 6, xs: 4 }}   // 6 cols (4 en XS)
              maxRows={20}
              compactType="vertical"
            >
              {items.map(it => (
                <div
                  key={it.i}
                  data-grid={{ x:it.x, y:it.y, w:it.w, h:it.h, minW:it.minW, minH:it.minH }}
                  className={`pv-item ${selectedId===it.i?'is-selected':''}`}
                  onMouseDown={()=>setSelectedId(it.i)}
                  aria-label={`Bloque ${labelBlock(it.type)}`}
                >
                  <div className="pv-item-content" style={{ zIndex: it.z }}>
                    <div className="pv-head">
                      <div className="pv-handle"><FiMove/> {labelBlock(it.type)}</div>
                      <div className="pv-actions">
                        <button className="pv-icon" title="Duplicar" onClick={()=>handleDuplicate(it.i)}><FiCopy/></button>
                        <button className="pv-icon danger" title="Eliminar" onClick={()=>handleRemove(it.i)}><FiTrash2/></button>
                      </div>
                    </div>
                    <div className="pv-body">
                      <Preview it={it}/>
                    </div>
                  </div>
                </div>
              ))}
            </ResponsiveGrid>
          </div>
        </section>

        {/* ----------- Sidebar derecha: propiedades ----------- */}
        <aside className={`sidebar pv-props ${propsOpen? 'open':'closed'}`}>
          <button className="drawer-close" onClick={() => setPropsOpen(false)} aria-label="Cerrar propiedades">
            <FiX/>
          </button>

          {sel ? (
            <div className="form-section">
              <h3><FiSettings/> Propiedades</h3>
              <small>Bloque: <strong>{sel.type}</strong></small>

              {/* Orden/Z */}
              <div className="form-group">
                <label className="form-label">Orden (capa)</label>
                <div className="form-row">
                  <button className="btn" onClick={()=>setLayer(({max})=>max+1)}>Traer al frente</button>
                  <button className="btn" onClick={()=>setItems(prev => prev.map(x=> x.i===sel.i?({...x, z:1}):x))}>Enviar al fondo</button>
                  <input
                    className="form-input"
                    type="number"
                    value={Number(sel.z||1)}
                    onChange={e=>setItems(prev=> prev.map(x=> x.i===sel.i? ({...x, z:Number(e.target.value||1)}):x))}
                  />
                </div>
              </div>

              {sel.type==='hero' && (
                <div className="form-group">
                  <label className="checkbox-item">
                    <input type="checkbox" checked={!!sel.props.showLogo} onChange={e=>updateProps({showLogo:e.target.checked})}/>
                    <span className="checkbox-label">Mostrar logo</span>
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={!!sel.props.showDescripcion} onChange={e=>updateProps({showDescripcion:e.target.checked})}/>
                    <span className="checkbox-label">Mostrar descripción</span>
                  </label>
                  <div className="form-group">
                    <label className="form-label">Alineación</label>
                    <select className="form-select" value={sel.props.align||'center'} onChange={e=>updateProps({align:e.target.value})}>
                      <option value="left">Izquierda</option>
                      <option value="center">Centrado</option>
                      <option value="right">Derecha</option>
                    </select>
                  </div>
                </div>
              )}

              {sel.type==='featured' && (
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input className="form-input" value={sel.props.title||''} onChange={e=>updateProps({title:e.target.value})}/>
                  <label className="form-label">Límite</label>
                  <input className="form-input" type="number" min="1" max="50" value={sel.props.limit??8} onChange={e=>updateProps({limit:Number(e.target.value||1)})}/>
                </div>
              )}

              {sel.type==='grid' && (
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input className="form-input" value={sel.props.title||''} onChange={e=>updateProps({title:e.target.value})}/>
                  <label className="form-label">Límite</label>
                  <input className="form-input" type="number" min="1" max="60" value={sel.props.limit??12} onChange={e=>updateProps({limit:Number(e.target.value||12)})}/>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={!!sel.props.showFilter} onChange={e=>updateProps({showFilter:e.target.checked})}/>
                    <span className="checkbox-label">Mostrar buscador/filtros</span>
                  </label>
                </div>
              )}

              {sel.type==='category' && (
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-select" value={sel.props.categoriaId||''} onChange={e=>updateProps({categoriaId: e.target.value? Number(e.target.value):null})}>
                    <option value="">— seleccionar —</option>
                    {categorias.map(c=> <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <label className="form-label">Título (opcional)</label>
                  <input className="form-input" value={sel.props.title||''} onChange={e=>updateProps({title:e.target.value})}/>
                  <label className="form-label">Límite</label>
                  <input className="form-input" type="number" min="1" max="60" value={sel.props.limit??12} onChange={e=>updateProps({limit:Number(e.target.value||12)})}/>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={!!sel.props.showFilter} onChange={e=>updateProps({showFilter:e.target.checked})}/>
                    <span className="checkbox-label">Mostrar buscador</span>
                  </label>
                </div>
              )}

              {sel.type==='product' && (
                <div className="form-group">
                  <label className="form-label">Producto</label>
                  <select className="form-select" value={sel.props.productoId||''} onChange={e=>updateProps({productoId: e.target.value? Number(e.target.value):null})}>
                    <option value="">— seleccionar —</option>
                    {productos.map(p=> <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <p className="form-hint">Puedes redimensionarlo libremente; no hay límite de 1×1.</p>
                </div>
              )}

              {sel.type==='banner' && (
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input className="form-input" value={sel.props.title||''} onChange={e=>updateProps({title:e.target.value})}/>
                  <label className="form-label">Texto del botón</label>
                  <input className="form-input" value={sel.props.ctaText||''} onChange={e=>updateProps({ctaText:e.target.value})}/>
                  <label className="form-label">URL del botón</label>
                  <input className="form-input" value={sel.props.ctaUrl||''} onChange={e=>updateProps({ctaUrl:e.target.value})} placeholder="https://..."/>
                  <p className="form-hint">El fondo usa <code>bannerPromoUrl</code> del perfil.</p>
                </div>
              )}

              {sel.type==='logo' && (
                <div className="form-group">
                  <label className="form-label">Forma</label>
                  <select className="form-select" value={sel.props.shape||'rounded'} onChange={e=>updateProps({shape: e.target.value})}>
                    <option value="circle">Circular</option>
                    <option value="square">Cuadrado</option>
                    <option value="rounded">Redondeado</option>
                    <option value="squircle">Squircle</option>
                  </select>
                  <label className="form-label">Marco</label>
                  <select className="form-select" value={sel.props.frame||'thin'} onChange={e=>updateProps({frame: e.target.value})}>
                    <option value="none">Sin marco</option>
                    <option value="thin">Delgado</option>
                    <option value="thick">Grueso</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="sidebar-tip"><h4>Propiedades</h4><p>Selecciona un bloque para editar sus opciones.</p></div>
          )}
        </aside>
      </div>

      {/* Scrim de drawers en móvil */}
      {(leftOpen || propsOpen) && <div className="drawer-scrim" onClick={()=>{setLeftOpen(false); setPropsOpen(false);}} aria-hidden="true" />}

      {/* Notificación flotante (fallback) */}
      {msg ? <div className="notification show" role="status" aria-live="polite">{msg}</div> : null}
    </div>
  );
}
