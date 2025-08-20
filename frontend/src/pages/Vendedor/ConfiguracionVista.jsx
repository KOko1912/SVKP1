// frontend/src/pages/Vendedor/ConfiguracionVista.jsx
// Versión modificada para usar solo plantilla 6x20

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Nabvendedor from './Nabvendedor';
import {
  Responsive as ResponsiveGridLayout,
  WidthProvider
} from 'react-grid-layout';
import {
  FiPlus, FiSave, FiRefreshCcw, FiSettings, FiTrash2, FiCopy,
  FiImage, FiLayers, FiStar, FiGrid, FiPackage, FiList, FiLayout,
  FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2, FiMove
} from 'react-icons/fi';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './ConfigVista.css';

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

const API   = import.meta.env.VITE_API_URL    || 'http://localhost:5000';
const FILES = import.meta.env.VITE_FILES_BASE || API;

/* ========================= */
/* Definición de bloques     */
/* ========================= */
const BLOCKS = [
  { type: 'hero',     icon: <FiImage/>,   name: 'Portada (Hero)',        w: 6, h: 4, minW: 4,  minH: 3 },
  { type: 'featured', icon: <FiStar/>,    name: 'Productos destacados',  w: 4,  h: 3, minW: 4,  minH: 2 },
  { type: 'grid',     icon: <FiGrid/>,    name: 'Todos los productos',   w: 6, h: 4, minW: 6,  minH: 3 },
  { type: 'category', icon: <FiList/>,    name: 'Categoría + productos', w: 4,  h: 3, minW: 4,  minH: 2 },
  { type: 'product',  icon: <FiPackage/>, name: 'Producto individual',   w: 2,  h: 3, minW: 2,  minH: 2 },
  { type: 'banner',   icon: <FiLayers/>,  name: 'Banner promocional',    w: 6, h: 3, minW: 4,  minH: 2 },
  { type: 'logo',     icon: <FiImage/>,   name: 'Logo',                  w: 2,  h: 4, minW: 2,  minH: 2 },
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
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/uploads') || s.startsWith('/TiendaUploads') || s.startsWith('/files')) return `${FILES}${s}`;
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

/* ========================= */
/* Componente principal      */
/* ========================= */
export default function ConfiguracionVista(){
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
  const [items, setItems] = useState([]); // [{i,id,type,props,z}]
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(true);

  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const layoutRef = useRef([]); // última versión del layout RGL por breakpoint md

  /* ---------------- Carga inicial ---------------- */
  useEffect(() => {
    document.body.classList.add('vendor-theme');
    return () => document.body.classList.remove('vendor-theme');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const rt = await fetch(`${API}/api/tienda/me`, { headers });
        const dt = await rt.json();
        setTienda(dt || {});

        const qs = dt?.id ? `?tiendaId=${dt.id}` : '';
        const rc = await fetch(`${API}/api/v1/categorias${qs}`, { headers });
        setCategorias(await rc.json().catch(()=>[]));

        const rp = await fetch(`${API}/api/v1/productos${qs}`, { headers });
        const dp = await rp.json();
        setProductos(Array.isArray(dp?.items)? dp.items : Array.isArray(dp)? dp : []);

        // Layout desde BD o local
        let stored = dt?.homeLayout || JSON.parse(localStorage.getItem(localKey) || 'null');
        let blocks = [];
        if (Array.isArray(stored)) blocks = stored; 
        else if (stored?.blocks) blocks = stored.blocks;
        
        if (!blocks.length) blocks = [ mk('grid', DEFAULT_PROPS.grid, { x:0,y:0,w:6,h:4 }) ];
        setItems(assignIds(blocks).map(b => toRGLItem(b)));
      } catch {
        const fallback = [ mk('grid', DEFAULT_PROPS.grid, { x:0,y:0,w:6,h:4 }) ];
        setItems(assignIds(fallback).map(b => toRGLItem(b)));
      }
    })();
  }, []);

  /* ---------------- Undo/Redo ---------------- */
  const pushHistory = useCallback((next) => {
    undoStack.current.push(JSON.stringify(next));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);
  const undo = () => { if (!undoStack.current.length) return; const curr = JSON.stringify(items); redoStack.current.push(curr); const prev = JSON.parse(undoStack.current.pop()); setItems(prev); };
  const redo = () => { if (!redoStack.current.length) return; const next = JSON.parse(redoStack.current.pop()); pushHistory(items); setItems(next); };

  useEffect(() => {
    const onKey = (e) => {
      const targetEditable = ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName);
      if (!targetEditable && selectedId && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); handleRemove(selectedId); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, items]);

  /* ---------------- Layout helpers ---------------- */
  const colByMode = () => 6; // Siempre 6 columnas para la plantilla 6x20

  const toRGLItem = (b) => ({
    i: b.id,
    id: b.id,
    type: b.type,
    props: b.props ?? DEFAULT_PROPS[b.type] ?? {},
    z: Number(b.z || 1),
    // layout por defecto para todas las resoluciones
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
    pushHistory(items);
    setItems(prev => ([ ...prev, { ...base, y: Infinity } ]));
    setSelectedId(base.i);
  };

  const handleRemove = (id) => { pushHistory(items); setItems(prev => prev.filter(it => it.i !== id)); if (selectedId === id) setSelectedId(null); toast('Bloque eliminado'); };
  const handleDuplicate = (id) => {
    const it = items.find(x=>x.i===id); if (!it) return;
    const copy = { ...it, i: `${it.type}-${uid()}`, id: `${it.type}-${uid()}`, x: (it.x+1)%6, y: it.y, z: it.z+1 };
    pushHistory(items); setItems(prev => [...prev, copy]); setSelectedId(copy.i); toast('Bloque duplicado');
  };

  const onLayoutChange = (layout /* array de items con x,y,w,h,i */, allLayouts) => {
    layoutRef.current = layout;
    // Sincronizar tamaños/posiciones al estado items
    setItems(prev => prev.map(it => {
      const l = layout.find(x=>x.i===it.i); if (!l) return it; return { ...it, x:l.x, y:l.y, w:l.w, h:l.h };
    }));
  };

  /* ---------------- Guardado ---------------- */
  const toast = (m) => { setMsg(m); clearTimeout(toast._t); toast._t = setTimeout(()=>setMsg(''), 1800); };

  const buildPayload = () => ({
    meta: { mode: 'TEMPLATE_6x20' },
    blocks: items.map(it => ({ id: it.i, type: it.type, z: it.z, props: it.props, gs: { x: it.x, y: it.y, w: it.w, h: it.h, minW: it.minW, minH: it.minH } }))
  });

  const save = async () => {
    setSaving(true);
    const payload = buildPayload();
    try {
      const r = await fetch(`${API}/api/tienda/me`, { method:'PUT', headers: headersJson, body: JSON.stringify({ homeLayout: payload }) });
      if (!r.ok) {
        localStorage.setItem(localKey, JSON.stringify(payload));
        toast('Guardado local.');
      } else toast('¡Diseño guardado!');
    } catch {
      localStorage.setItem(localKey, JSON.stringify(payload));
      toast('Guardado local (offline).');
    } finally { setSaving(false); }
  };

  // Autosave suave cada 1.5s después de mover/redimensionar
  useEffect(() => {
    const t = setTimeout(() => { localStorage.setItem(localKey, JSON.stringify(buildPayload())); }, 1500);
    return () => clearTimeout(t);
  }, [items]);

  /* ---------------- Render previews ---------------- */
  const extractColors = (gradientString) => { const m = String(gradientString||'').match(/#([0-9a-f]{6})/gi); return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' }; };

  const Card = ({p}) => {
    const src = toPublicUrl((p?.imagenes?.find(x=>x.isPrincipal)||p?.imagenes?.[0])?.url);
    return (
      <article className="pv-card">
        <figure className="pv-card-cover" style={{ backgroundImage: src?`url(${src})`: undefined }} />
        <div className="pv-card-info">
          <h4 className="pv-card-title">{p?.nombre||'Producto'}</h4>
          <div className="pv-card-price">{typeof p?.precio==='number' ? `$${Number(p.precio).toFixed(2)}` : <span className="pv-muted">Con variantes</span>}</div>
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
      const items = (productos||[]).slice(0, it.props.limit ?? 12);
      return (
        <div className="pv-stack">
          {it.props.title ? <h4 className="pv-section-title">{it.props.title}</h4> : null}
          <div className="pv-grid">{items.length? items.map(p=> <Card key={p.id} p={p}/>) : <div className="pv-empty">Sin productos</div>}</div>
        </div>
      );
    }
    if (it.type==='category'){
      const catId = it.props.categoriaId ? Number(it.props.categoriaId) : null;
      const items = catId ? (productos||[]).filter(p => Array.isArray(p.categorias) && p.categorias.some(pc => pc.categoriaId === catId)).slice(0, it.props.limit ?? 12) : [];
      const title = it.props.title || (categorias.find(c=>c.id===catId)?.nombre || 'Categoría');
      return (
        <div className="pv-stack">
          <h4 className="pv-section-title">{title}</h4>
          <div className="pv-grid">{items.length? items.map(p=> <Card key={p.id} p={p}/>) : <div className="pv-empty">Selecciona la categoría</div>}</div>
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
  const updateProps = (patch) => setItems(prev => prev.map(x => x.i===selectedId ? ({ ...x, props: { ...x.props, ...patch } }) : x));
  const setLayer = (fn) => setItems(prev => prev.map(x => x.i===selectedId ? ({ ...x, z: fn({ curr: Number(x.z)||1, max: Math.max(1,...prev.map(y=>Number(y.z)||1)) }) }) : x));

  return (
    <div className="vendedor-container">
      <Nabvendedor/>

      {/* Header visual opcional usando datos de tienda */}
      <header className="tienda-header" style={{ backgroundImage: tienda?.portadaUrl? `url(${toPublicUrl(tienda.portadaUrl)})` : undefined }}>
        <div className="tienda-header-content">
          <div className="tienda-header-info">
            {tienda?.logoUrl ? (<img className="tienda-logo" src={toPublicUrl(tienda.logoUrl)} alt="logo"/>) : null}
            <div>
              <h1 className="tienda-nombre">{tienda?.nombre || 'Mi tienda'}</h1>
              {tienda?.descripcion ? (<p className="tienda-descripcion">{tienda.descripcion}</p>) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Panel superior acciones */}
      <div className="config-panel">
        <aside className="sidebar">
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
          </div>

          <div className="form-section">
            <h3><FiPlus/> Bloques</h3>
            {BLOCKS.map(b => (
              <div key={b.type} className="sidebar-item" onClick={()=>paletteAdd(b.type)}>
                <span className="sidebar-icon">{b.icon}</span>
                <span>{b.name}</span>
                <span className="pv-grow"/>
                <FiPlus/>
              </div>
            ))}
            <div className="sidebar-tip">
              <h4>Tips</h4>
              <p>Arrastra con el mango <FiMove/>. Usa eliminar <kbd>Del</kbd> y duplicar <kbd>Ctrl+D</kbd> (click en ⋮ del bloque).</p>
            </div>
          </div>
        </aside>

        <section className="content-area">
          <div className="pv-toolbar">
            <div className="pv-left">
              <button className="btn" onClick={()=>setDrawerOpen(v=>!v)}>{drawerOpen? <><FiMinimize2/> Ocultar props</> : <><FiMaximize2/> Mostrar props</>}</button>
            </div>
            <div className="pv-right">
              {msg ? <div className="notification show">{msg}</div> : null}
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
              draggableHandle=".pv-handle"
              breakpoints={{ xl: 1400, lg: 996, md: 768, sm: 480, xs: 0 }}
              cols={{ xl: 6, lg: 6, md: 6, sm: 6, xs: 4 }} // Siempre 6 columnas (4 en móvil)
              compactType="vertical"
            >
              {items.map(it => (
                <div key={it.i} data-grid={{ x:it.x, y:it.y, w:it.w, h:it.h, minW:it.minW, minH:it.minH }}
                     className={`pv-item ${selectedId===it.i?'is-selected':''}`}
                     onMouseDown={()=>setSelectedId(it.i)}
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

        {/* Panel de propiedades */}
        <aside className={`sidebar pv-props ${drawerOpen? 'open':'closed'}`}>
          {sel ? (
            <div className="form-section">
              <h3><FiSettings/> Propiedades</h3>
              <small>Bloque: <strong>{sel.type}</strong></small>

              {/* Orden/Z */}
              <div className="form-group">
                <label className="form-label">Orden (capa)</label>
                <div className="form-row">
                  <button className="btn" onClick={()=>setLayer(({max,curr})=>max+1)}>Traer al frente</button>
                  <button className="btn" onClick={()=>setItems(prev => prev.map(x=> x.i===sel.i?({...x, z:1}):x))}>Enviar al fondo</button>
                  <input className="form-input" type="number" value={Number(sel.z||1)} onChange={e=>setItems(prev=> prev.map(x=> x.i===sel.i? ({...x, z:Number(e.target.value||1)}):x))} />
                </div>
              </div>

              {sel.type==='hero' && (
                <div className="form-group">
                  <label className="checkbox-item"><input type="checkbox" checked={!!sel.props.showLogo} onChange={e=>updateProps({showLogo:e.target.checked})}/><span className="checkbox-label">Mostrar logo</span></label>
                  <label className="checkbox-item"><input type="checkbox" checked={!!sel.props.showDescripcion} onChange={e=>updateProps({showDescripcion:e.target.checked})}/><span className="checkbox-label">Mostrar descripción</span></label>
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
                  <label className="checkbox-item"><input type="checkbox" checked={!!sel.props.showFilter} onChange={e=>updateProps({showFilter:e.target.checked})}/><span className="checkbox-label">Mostrar buscador/filtros</span></label>
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
                  <label className="checkbox-item"><input type="checkbox" checked={!!sel.props.showFilter} onChange={e=>updateProps({showFilter:e.target.checked})}/><span className="checkbox-label">Mostrar buscador</span></label>
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

      {/* Notificación flotante (fallback) */}
      {msg ? <div className="notification show">{msg}</div> : null}
    </div>
  );
}