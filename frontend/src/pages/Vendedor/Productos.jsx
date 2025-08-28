// frontend/src/pages/Vendedor/Productos.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nabvendedor from './Nabvendedor';
import {
  FiPlus, FiRefreshCcw, FiSearch, FiTag, FiEdit2, FiTrash2,
  FiEye, FiStar, FiUpload, FiX, FiCheck, FiPause, FiPlay,
  FiChevronLeft, FiChevronRight, FiInfo, FiSettings
} from 'react-icons/fi';
import './Productos.css';

const API   = import.meta.env.VITE_API_URL    || 'http://localhost:5000';
const FILES = import.meta.env.VITE_FILES_BASE || API;

// 🔗 Normaliza cualquier URL (absoluta de Supabase o relativa local)
const toPublicSrc = (u) => {
  const v = typeof u === 'string' ? u : (u?.url || '');
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `${FILES}${v.startsWith('/') ? '' : '/'}${v}`;
};

/* -------------------- Tipos de producto -------------------- */
const TIPOS = [
  { value: 'SIMPLE',   label: 'Simple',   desc: 'Un solo SKU con precio y stock únicos.' },
  { value: 'VARIANTE', label: 'Con variantes', desc: 'Varias combinaciones (talla, color…).'},
  { value: 'DIGITAL',  label: 'Digital',  desc: 'Archivo descargable (no requiere stock).'},
  { value: 'SERVICIO', label: 'Servicio', desc: 'Reservas/citas; precio por sesión.' },
  { value: 'BUNDLE',   label: 'Bundle',   desc: 'Paquete de varios productos (combos).'},
];

/* -------------------- helpers de tema -------------------- */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
const hexToRgb = (hex) => { const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i); if (!m) return [0,0,0]; return [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)]; };
const luminance = ([r,g,b]) => { const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; };
const bestTextOn = (hexA, hexB) => { const L=(luminance(hexToRgb(hexA))+luminance(hexToRgb(hexB)))/2; return L>0.45?'#111111':'#ffffff'; };
const extractColors = (gradientString) => { const m = gradientString?.match(/#([0-9a-f]{6})/gi); return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' }; };

/* -------------------- Normalizador numérico -------------------- */
// Convierte Decimal|string|number|null -> number | ''
const asNum = (x) => {
  if (x === null || x === undefined) return '';
  if (typeof x === 'number') return x;
  if (typeof x === 'string') return x.trim() === '' ? '' : Number(x);
  if (typeof x === 'object') {
    if (typeof x.toNumber === 'function') { try { return x.toNumber(); } catch {} }
    const v = x.valueOf?.(); if (typeof v === 'number') return v;
  }
  const n = Number(x);
  return Number.isFinite(n) ? n : '';
};

/* -------------------- Carrusel de imágenes -------------------- */
const ImageCarousel = ({ images, productName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) {
    return <div className="producto-media-empty"><span>Sin imágenes</span></div>;
  }
  const nextImage = () => setCurrentIndex((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentIndex((p) => (p - 1 + images.length) % images.length);
  return (
    <div className="producto-media-carousel" aria-roledescription="carrusel" aria-label={`Imágenes de ${productName}`}>
      <button className="carousel-btn prev" onClick={prevImage} aria-label="Imagen anterior"><FiChevronLeft /></button>
      <img
        src={toPublicSrc(images[currentIndex])}
        alt={`${productName} – imagen ${currentIndex + 1} de ${images.length}`}
        className="carousel-image"
        loading="lazy"
        decoding="async"
        sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <button className="carousel-btn next" onClick={nextImage} aria-label="Siguiente imagen"><FiChevronRight /></button>
      <div className="carousel-dots" role="tablist" aria-label="Selector de imagen">
        {images.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Ir a imagen ${i + 1}`}
            aria-selected={i === currentIndex}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
};

export default function Productos() {
  /* -------------------- estado base -------------------- */
  const navigate = useNavigate();
  const [tiendaId, setTiendaId] = useState(null);

  const [q, setQ] = useState('');
  const [categoriaSel, setCategoriaSel] = useState('todas');
  const [estadoSel, setEstadoSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoCats, setCargandoCats] = useState(false);
  const [error, setError] = useState('');

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editCatId, setEditCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [mode, setMode] = useState('create');
  const [editId, setEditId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  /* -------- Variantes (sub-modal) -------- */
  const [showVariantes, setShowVariantes] = useState(false);
  const [vList, setVList] = useState([]);
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState('');
  const [vMode, setVMode] = useState('create');
  const [vEditId, setVEditId] = useState(null);
  const [vSaving, setVSaving] = useState(false);
  const [vForm, setVForm] = useState(defaultVForm());

  /* ------ refs para foco en modales ------ */
  const refCatInput   = useRef(null);
  const refProdNombre = useRef(null);

  /* -------------------- auth headers -------------------- */
  const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; } })();
  const token = localStorage.getItem('token');
  const baseHeaders = { ...(usuario?.id ? { 'x-user-id': usuario.id } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), };

  /* -------------------- tema brand (solo variables CSS) -------------------- */
  useEffect(() => {
    document.body.classList.add('vendor-theme', 'has-topfixed', 'has-bottomnav');
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/me`, { headers: baseHeaders });
        const d = await r.json();
        if (r.ok && d?.id) setTiendaId(Number(d.id));
      } catch {}
    })();
    return () => document.body.classList.remove('vendor-theme', 'has-topfixed', 'has-bottomnav');
  }, []);

  /* -------------------- cargar categorías -------------------- */
  useEffect(() => {
    if (!tiendaId) return;
    (async () => {
      setCargandoCats(true);
      try {
        const res = await fetch(`${API}/api/v1/categorias?tiendaId=${tiendaId}`, { headers: baseHeaders });
        const data = res.ok ? await res.json() : [];
        setCategorias(Array.isArray(data) ? data : []);
      } catch { setCategorias([]); }
      finally { setCargandoCats(false); }
    })();
  }, [tiendaId]);

  /* -------------------- cargar productos -------------------- */
  const cargar = async () => {
    if (!tiendaId) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      params.set('tiendaId', String(tiendaId));
      if (q.trim()) params.set('q', q.trim());
      if (estadoSel) params.set('estado', estadoSel);
      if (categoriaSel && categoriaSel !== 'todas') params.set('categoria', categoriaSel);
      const res = await fetch(`${API}/api/v1/productos?${params.toString()}`, { headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudieron cargar los productos.');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) { setError(e?.message || 'Ocurrió un error al actualizar.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (tiendaId) cargar(); }, [tiendaId, q, categoriaSel, estadoSel]);

  /* -------------------- organizar productos por categoría -------------------- */
  const productosPorCategoria = useMemo(() => {
    const term = q.trim().toLowerCase();
    const fil = productos.filter((p) => {
      if (categoriaSel !== 'todas') {
        const ok = p?.categoria?.slug === categoriaSel ||
          (Array.isArray(p?.categorias) && p.categorias.some((pc) => pc?.categoria?.slug === categoriaSel));
        if (!ok) return false;
      }
      if (estadoSel && p?.estado !== estadoSel) return false;
      if (!term) return true;
      return (
        p?.nombre?.toLowerCase?.().includes(term) ||
        p?.slug?.toLowerCase?.().includes(term) ||
        p?.sku?.toLowerCase?.().includes(term)
      );
    });

    if (categoriaSel !== 'todas') {
      return [{ categoria: categorias.find(c => c.slug === categoriaSel) || { id: -1, nombre: 'Seleccionados' }, productos: fil }];
    }
    const catCon = categorias.map(cat => ({
      categoria: cat,
      productos: fil.filter(p =>
        p?.categoria?.id === cat.id || p?.categorias?.some(pc => pc.categoriaId === cat.id)
      )
    }));
    const sinCat = fil.filter(p => !p?.categoria?.id && (!p?.categorias || p.categorias.length === 0));
    if (sinCat.length) catCon.push({ categoria: { id: 0, nombre: 'Sin categoría', slug: 'sin-categoría' }, productos: sinCat });
    return catCon.filter(g => g.productos.length > 0);
  }, [productos, categorias, q, categoriaSel, estadoSel]);

  /* -------------------- helpers -------------------- */
  function slugify(str) { return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''); }
  function calcStock(p) {
    if (p?.inventario) return asNum(p.inventario.stock) || 0;
    if (Array.isArray(p?.variantes)) return p.variantes.reduce((acc, v) => acc + (asNum(v?.inventario?.stock) || 0), 0);
    return 0;
  }
  function stockText(p) {
    const s = calcStock(p);
    const umbral = asNum(p?.inventario?.umbralAlerta) || 3;
    if (s <= 0) return 'Sin stock';
    if (s <= umbral) return `Stock bajo (${s})`;
    return `En stock: ${s}`;
  }
  function currency(n) { if (!Number.isFinite(n)) return ''; try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n); } catch { return `$${Number(n || 0).toFixed(2)}`; } }

  /* -------------------- acciones productos -------------------- */
  const crearProducto = () => {
    setMode('create'); setEditId(null); setForm(defaultForm()); setErrors({});
    setShowEditor(true);
  };

  const productToForm = (p) => {
    const catIds = Array.isArray(p?.categorias)
      ? p.categorias.map((x) => x?.categoriaId ?? x?.categoria?.id ?? x?.id).filter(Boolean)
      : p?.categoriaId ? [p.categoriaId] : [];

    return {
      // básicos
      nombre: p?.nombre || '', descripcion: p?.descripcion || '', tipo: p?.tipo || 'SIMPLE',
      estado: p?.estado || 'DRAFT', visible: !!p?.visible, destacado: !!p?.destacado,
      // comercio (normalizado)
      precio: asNum(p?.precio),
      precioComparativo: asNum(p?.precioComparativo),
      costo: asNum(p?.costo),
      descuentoPct: asNum(p?.descuentoPct),
      // inventario simple
      inventarioStock: asNum(p?.inventario?.stock),
      inventarioUmbral: (asNum(p?.inventario?.umbralAlerta) === '' ? 3 : asNum(p?.inventario?.umbralAlerta)),
      backorder: !!p?.inventario?.permitirBackorder,
      // categorías e imágenes
      categoriasIds: catIds,
      imagenes: Array.isArray(p?.imagenes)
        ? p.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || '', isPrincipal: !!m.isPrincipal, orden: typeof m.orden === 'number' ? m.orden : i }))
        : [],
      // avanzados (normalizados donde aplica)
      sku: p?.sku || '', gtin: p?.gtin || '', marca: p?.marca || '', condicion: p?.condicion || '',
      pesoGramos: asNum(p?.pesoGramos),
      altoCm: asNum(p?.altoCm), anchoCm: asNum(p?.anchoCm), largoCm: asNum(p?.largoCm),
      claseEnvio: p?.claseEnvio || '', diasPreparacion: asNum(p?.diasPreparacion),
      politicaDevolucion: p?.politicaDevolucion || '',
      // ⬇️ si el backend devuelve relación `digital`, úsala; si no, fallback a digitalUrl
      digitalUrl: p?.digital?.url || p?.digitalUrl || '',
      licOriginal: Boolean(p?.licenciamiento?.original),
      licNotas: typeof p?.licenciamiento?.notas === 'string' ? p.licenciamiento.notas : '',
    };
  };

  const editarProducto = (p) => {
    setMode('edit'); setEditId(p.id); setForm(productToForm(p)); setErrors({}); setShowEditor(true);
  };

  const verPublico = (p) => {
    if (!p?.uuid) { alert('Este producto no tiene UUID. Guarda el producto primero.'); return; }
    navigate(`/producto/${p.uuid}`, { replace: false });
  };

  const eliminarProducto = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esto lo archivará (borrado lógico).`)) return;
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar el producto.');
      setProductos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) { alert(e?.message || 'Error al eliminar'); }
  };

  // 🔥 Eliminación permanente (solo para ARCHIVED)
  const eliminarProductoPermanente = async (p) => {
    if (!confirm(`⚠️ Eliminación PERMANENTE\n\nSe borrará "${p.nombre}" y TODAS sus variantes, inventarios e imágenes.\n\nEsta acción es IRREVERSIBLE. ¿Continuar?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}?force=1`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar permanentemente.');
      setProductos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) { alert(e?.message || 'Error al eliminar permanentemente'); }
  };

  const toggleEstado = async (p) => {
    const next = p.estado === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ estado: next }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar el estado.');
      const act = await res.json();
      setProductos((prev) => prev.map((x) => (x.id === act.id ? act : x)));
    } catch (e) { alert(e?.message || 'Error al actualizar estado'); }
  };

  const toggleDestacado = async (p) => {
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ destacado: !p.destacado }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar destacado.');
      const act = await res.json();
      setProductos((prev) => prev.map((x) => (x.id === act.id ? act : x)));
    } catch (e) { alert(e?.message || 'Error al actualizar destacado'); }
  };

  /* -------------------- categorías (API) -------------------- */
  const agregarCategoria = async () => {
    const nombre = newCatName.trim();
    if (!nombre || !tiendaId) { alert('Escribe un nombre para la categoría.'); return; }
    try {
      const res = await fetch(`${API}/api/v1/categorias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ tiendaId, nombre }),
      });
      if (!res.ok) throw new Error('No se pudo crear la categoría.');
      const creada = await res.json();
      setCategorias((prev) => [creada, ...prev]); setNewCatName('');
    } catch (e) { alert(e?.message || 'Error al crear categoría'); }
  };

  const guardarEdicionCat = async () => {
    const nombre = editCatName.trim();
    if (!nombre || !editCatId) return;
    try {
      const res = await fetch(`${API}/api/v1/categorias/${editCatId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ nombre }),
      });
      const act = await (res.ok ? res.json() : Promise.reject());
      setCategorias((prev) => prev.map((c) => (c.id === act.id ? act : c)));
      setEditCatId(null); setEditCatName('');
    } catch (e) { alert(e?.message || 'Error al renombrar categoría'); }
  };

  const eliminarCategoria = async (id) => {
    if (!confirm('¿Eliminar categoría? Los productos no se borran.')) return;
    try {
      const res = await fetch(`${API}/api/v1/categorias/${id}`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar la categoría.');
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      if (categoriaSel !== 'todas' && categorias.find((c) => c.id === id)?.slug === categoriaSel) setCategoriaSel('todas');
    } catch (e) { alert(e?.message || 'Error al eliminar categoría'); }
  };

  /* -------------------- editor (crear/editar) -------------------- */
  function defaultForm() {
    return {
      // básicos
      nombre: '', descripcion: '', tipo: 'SIMPLE', estado: 'DRAFT', visible: true, destacado: false,
      // comercio
      precio: '', precioComparativo: '', costo: '', descuentoPct: '',
      // inventario simple
      inventarioStock: '', inventarioUmbral: 3, backorder: false,
      // taxonomía y media
      categoriasIds: [], imagenes: [],
      // avanzados
      sku: '', gtin: '', marca: '', condicion: '',
      pesoGramos: '', altoCm: '', anchoCm: '', largoCm: '',
      claseEnvio: '', diasPreparacion: '', politicaDevolucion: '',
      digitalUrl: '', licOriginal: false, licNotas: '',
    };
  }

  const precioNum     = useMemo(() => (form.precio === '' ? null : Number(form.precio)), [form.precio]);
  const precioCompNum = useMemo(() => (form.precioComparativo === '' ? null : Number(form.precioComparativo)), [form.precioComparativo]);
  const costoNum      = useMemo(() => (form.costo === '' ? null : Number(form.costo)), [form.costo]);

  const descuentoSugerido = useMemo(() => {
    if (precioNum != null && precioCompNum && precioCompNum > 0) {
      return Math.max(0, Math.round((1 - (precioNum / precioCompNum)) * 100));
    }
    return null;
  }, [precioNum, precioCompNum]);

  const margen = useMemo(() => {
    if (precioNum != null && costoNum != null) {
      const m = precioNum - costoNum; const pct = costoNum > 0 ? (m / costoNum) * 100 : null;
      return { m, pct };
    }
    return null;
  }, [precioNum, costoNum]);

  const computedSlug = useMemo(() => slugify(form.nombre), [form.nombre]);

  /* -------------------- imágenes producto -------------------- */
  const onUploadImages = async (files) => {
    if (!files?.length) return;
    const uploads = Array.from(files).slice(0, 12 - form.imagenes.length);

    for (const f of uploads) {
      try {
        const fd = new FormData();
        fd.append('file', f);

        let url = '';
        if (mode === 'edit' && editId) {
          // Producto existente → liga Media + ProductoImagen en backend
          const res = await fetch(`${API}/api/media/productos/${editId}/imagenes`, {
            method: 'POST',
            headers: { ...baseHeaders },
            body: fd,
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo subir imagen');
          url = json.url;
        } else {
          // Aún no hay productId → staging (solo Media); luego guardas el producto con esas URLs
          const res = await fetch(`${API}/api/media?folder=staging/productos`, {
            method: 'POST',
            headers: { ...baseHeaders },
            body: fd,
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo subir imagen');
          url = json.media?.url || json.url;
        }

        setForm((prev) => {
          const next = [...prev.imagenes];
          next.push({ url, alt: '', isPrincipal: next.length === 0, orden: next.length });
          return { ...prev, imagenes: next };
        });
      } catch (e) {
        alert(e?.message || 'Error subiendo imagen');
      }
    }
  };

  const setPrincipal = (idx) => {
    setForm((prev) => {
      const next = prev.imagenes.map((img, i) => ({ ...img, isPrincipal: i === idx, orden: i === idx ? 0 : img.orden }));
      next.sort((a, b) => (a.isPrincipal ? -1 : b.isPrincipal ? 1 : 0));
      next.forEach((img, i) => { img.orden = i; });
      return { ...prev, imagenes: next };
    });
  };
  const removeImagen = (idx) => {
    setForm((prev) => {
      const next = prev.imagenes.filter((_, i) => i !== idx).map((img, i) => ({ ...img, orden: i }));
      if (!next.some((i) => i.isPrincipal) && next[0]) next[0].isPrincipal = true;
      return { ...prev, imagenes: next };
    });
  };
  const moveImagen = (idx, dir = -1) => {
    setForm((prev) => {
      const arr = [...prev.imagenes];
      const j = idx + dir; if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
      arr.forEach((img, i) => (img.orden = i));
      if (!arr.some((x) => x.isPrincipal)) arr[0].isPrincipal = true;
      return { ...prev, imagenes: arr };
    });
  };
  const updateAlt = (idx, alt) => {
    setForm((prev) => {
      const arr = [...prev.imagenes];
      if (!arr[idx]) return prev;
      arr[idx] = { ...arr[idx], alt };
      return { ...prev, imagenes: arr };
    });
  };
  const handleDrop    = (e) => { e.preventDefault(); e.stopPropagation(); const files = e.dataTransfer?.files; if (files?.length) onUploadImages(files); };
  const handleDragOver= (e) => { e.preventDefault(); e.stopPropagation(); };

  const toggleCategoria = (id) => {
    setForm((prev) => {
      const set = new Set(prev.categoriasIds);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...prev, categoriasIds: Array.from(set) };
    });
  };

  /* -------------------- validación -------------------- */
  function validate() {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
    if (form.tipo === 'SIMPLE') {
      if (form.precio === '' || Number.isNaN(Number(form.precio))) errs.precio = 'Indica el precio de venta.';
      if (form.inventarioStock === '' || Number.isNaN(Number(form.inventarioStock))) errs.stock = 'Indica el stock disponible.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const buildLicenciamiento = () => {
    if (!form.licOriginal && !form.licNotas) return null;
    return { original: !!form.licOriginal, ...(form.licNotas ? { notas: form.licNotas } : {}) };
  };

  const submitEditor = async (e) => {
    e.preventDefault();
    if (!tiendaId) { alert('No se encontró tu tienda. Ve a Configuración → Perfil.'); return; }
    if (!validate()) return;

    const payload = {
      tiendaId,
      // básicos
      nombre: form.nombre.trim(),
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      estado: form.estado,
      visible: !!form.visible,
      destacado: !!form.destacado,
      // comercio
      precio: form.precio === '' ? null : Number(form.precio),
      precioComparativo: form.precioComparativo === '' ? null : Number(form.precioComparativo),
      costo: form.costo === '' ? null : Number(form.costo),
      descuentoPct: form.descuentoPct === '' ? null : Number(form.descuentoPct),
      // identificadores
      sku: form.sku || null,
      gtin: form.gtin || null,
      marca: form.marca || null,
      condicion: form.condicion || null,
      // envío y dimensiones
      pesoGramos: form.pesoGramos === '' ? null : Number(form.pesoGramos),
      altoCm: form.altoCm === '' ? null : Number(form.altoCm),
      anchoCm: form.anchoCm === '' ? null : Number(form.anchoCm),
      largoCm: form.largoCm === '' ? null : Number(form.largoCm),
      claseEnvio: form.claseEnvio || null,
      diasPreparacion: form.diasPreparacion === '' ? null : Number(form.diasPreparacion),
      politicaDevolucion: form.politicaDevolucion || null,
      // ⬇️ seguimos enviando digitalUrl; el backend lo mapea a digitalId
      digitalUrl: form.tipo === 'DIGITAL' ? (form.digitalUrl || null) : null,
      licenciamiento: buildLicenciamiento(),
      // taxonomía e imágenes
      categoriasIds: form.categoriasIds,
      imagenes: form.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || null, isPrincipal: !!m.isPrincipal, orden: i })),
      // inventario producto simple
      inventario: form.tipo === 'SIMPLE' && form.inventarioStock !== ''
        ? { stock: Number(form.inventarioStock), umbralAlerta: form.inventarioUmbral === '' ? 0 : Number(form.inventarioUmbral), permitirBackorder: !!form.backorder }
        : null,
    };

    try {
      setSaving(true);
      let res;
      if (mode === 'edit' && editId) {
        res = await fetch(`${API}/api/v1/productos/${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...baseHeaders }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/api/v1/productos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...baseHeaders }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error((await res.text().catch(()=>'')) || 'No se pudo guardar el producto.');
      const data = await res.json();
      setShowEditor(false); setForm(defaultForm()); setEditId(null); setErrors({});
      if (mode === 'edit') setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      else setProductos((prev) => [data, ...prev]);
    } catch (e) { alert(e?.message || 'Error al guardar producto'); }
    finally { setSaving(false); }
  };

  /* -------------------- Variantes -------------------- */
  function defaultVForm() {
    return { sku: '', nombre: '', opcionesText: '', precio: '', precioComparativo: '', costo: '', stock: '', umbral: 0, backorder: false, imagenes: [] };
  }
  const openVariantesModal = async (productoId) => {
    if (!productoId) return; setVError(''); setVLoading(true); setShowVariantes(true);
    try {
      const res = await fetch(`${API}/api/v1/productos/${productoId}`, { headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo cargar el producto.');
      const data = await res.json();
      setVList(Array.isArray(data?.variantes) ? data.variantes : []);
      setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch (e) { setVError(e?.message || 'Error al cargar variantes'); }
    finally { setVLoading(false); }
  };
  const refreshProductoLocal = async () => {
    if (!editId) return;
    try {
      const res = await fetch(`${API}/api/v1/productos/${editId}`, { headers: baseHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setVList(Array.isArray(data?.variantes) ? data.variantes : []);
      setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch {}
  };
  const vStartCreate = () => { setVMode('create'); setVEditId(null); setVForm(defaultVForm()); };
  const safeStringify = (o) => { try { return JSON.stringify(o); } catch { return ''; } };
  const parseOpciones = (t) => { const s = String(t||'').trim(); if(!s) return null; try { const o = JSON.parse(s); return (o && typeof o==='object')?o:null; } catch { return null; } };
  const vStartEdit = (v) => {
    setVMode('edit'); setVEditId(v.id);
    setVForm({
      sku: v.sku || '', nombre: v.nombre || '', opcionesText: v.opciones ? safeStringify(v.opciones) : '',
      precio: asNum(v.precio) === '' ? '' : String(asNum(v.precio)),
      precioComparativo: asNum(v.precioComparativo) === '' ? '' : String(asNum(v.precioComparativo)),
      costo: asNum(v.costo) === '' ? '' : String(asNum(v.costo)),
      stock: asNum(v?.inventario?.stock) === '' ? '' : String(asNum(v?.inventario?.stock)),
      umbral: Number(asNum(v?.inventario?.umbralAlerta) || 0),
      backorder: !!v?.inventario?.permitirBackorder,
      imagenes: Array.isArray(v?.imagenes) ? v.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || '', orden: typeof m.orden === 'number' ? m.orden : i })) : [],
    });
  };
  const submitVariante = async (e) => {
    e.preventDefault();
    if (!editId) { alert('Primero guarda el producto.'); return; }
    const payload = {
      sku: vForm.sku || null, nombre: vForm.nombre || null, opciones: parseOpciones(vForm.opcionesText),
      precio: vForm.precio === '' ? null : Number(vForm.precio),
      precioComparativo: vForm.precioComparativo === '' ? null : Number(vForm.precioComparativo),
      costo: vForm.costo === '' ? null : Number(vForm.costo),
      inventario: vForm.stock === '' && vMode === 'create' && vForm.umbral === 0 && !vForm.backorder
        ? null
        : { stock: vForm.stock === '' ? 0 : Number(vForm.stock), umbralAlerta: Number(vForm.umbral || 0), permitirBackorder: !!vForm.backorder },
      imagenes: vForm.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || null, orden: i })),
    };
    try {
      setVSaving(true);
      let res;
      if (vMode === 'edit' && vEditId) {
        res = await fetch(`${API}/api/v1/variantes/${vEditId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', ...baseHeaders }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/api/v1/productos/${editId}/variantes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...baseHeaders }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error('No se pudo guardar la variante.');
      await refreshProductoLocal(); vStartCreate();
    } catch (e2) { alert(e2?.message || 'Error al guardar variante'); }
    finally { setVSaving(false); }
  };
  const eliminarVariante = async (v) => {
    if (!confirm(`¿Eliminar variante "${v.nombre || v.sku || v.id}"?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/variantes/${v.id}`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar la variante.');
      await refreshProductoLocal(); if (vEditId === v.id) vStartCreate();
    } catch (e) { alert(e?.message || 'Error al eliminar variante'); }
  };

  // ⬇️ Subida de imágenes de variante → /api/media/variantes/:id/imagenes o staging
  const onUploadVImages = async (files) => {
    if (!files?.length) return;
    const uploads = Array.from(files).slice(0, 12 - vForm.imagenes.length);

    for (const f of uploads) {
      try {
        const fd = new FormData();
        fd.append('file', f);

        let url = '';
        if (vMode === 'edit' && vEditId) {
          const res = await fetch(`${API}/api/media/variantes/${vEditId}/imagenes`, {
            method: 'POST',
            headers: { ...baseHeaders },
            body: fd,
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo subir imagen');
          url = json.url;
        } else {
          const res = await fetch(`${API}/api/media?folder=staging/variantes`, {
            method: 'POST',
            headers: { ...baseHeaders },
            body: fd,
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo subir imagen');
          url = json.media?.url || json.url;
        }

        setVForm((prev) => {
          const next = [...prev.imagenes];
          next.push({ url, alt: '', orden: next.length });
          return { ...prev, imagenes: next };
        });
      } catch (e) {
        alert(e?.message || 'Error subiendo imagen');
      }
    }
  };

  const moveVImagen = (idx, dir = -1) => { setVForm((prev) => { const arr = [...prev.imagenes]; const j = idx + dir; if (j < 0 || j >= arr.length) return prev; const t = arr[idx]; arr[idx] = arr[j]; arr[j] = t; arr.forEach((img, i) => (img.orden = i)); return { ...prev, imagenes: arr }; }); };
  const removeVImagen = (idx) => { setVForm((prev) => { const arr = prev.imagenes.filter((_, i) => i !== idx).map((m, i) => ({ ...m, orden: i })); return { ...prev, imagenes: arr }; }); };
  const updateVAlt = (idx, alt) => { setVForm((prev) => { const arr = [...prev.imagenes]; if (!arr[idx]) return prev; arr[idx] = { ...arr[idx], alt }; return { ...prev, imagenes: arr }; }); };

  /* -------------------- render -------------------- */
  return (
    <div className="productos-page">
      <Nabvendedor />

      <main className="productos-main">
        {/* Toolbar */}
        <header className="productos-toolbar">
          <div className="toolbar-card">
            <div className="productos-header">
              <h1>Productos</h1>
              <p>Agrega y administra tu catálogo de forma rápida.</p>
            </div>

            <div className="productos-actions">
              <label className="buscar" aria-label="Buscar">
                <FiSearch className="i" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, slug o SKU…" />
              </label>

              <select value={categoriaSel} onChange={(e) => setCategoriaSel(e.target.value)} disabled={cargandoCats} title="Filtrar por categoría">
                <option value="todas">Todas las categorías</option>
                {categorias.map((c) => (<option key={c.id} value={c.slug}>{c.nombre}</option>))}
              </select>

              <select value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)} title="Filtrar por estado">
                <option value="">Todos</option>
                <option value="ACTIVE">Activo</option>
                <option value="DRAFT">Borrador</option>
                <option value="PAUSED">Pausado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>

              <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}><FiTag /> Categorías</button>
              <button className="btn btn-primary" onClick={crearProducto}><FiPlus /> Nuevo producto</button>
              <button className="btn btn-ghost" onClick={cargar} disabled={loading || !tiendaId}><FiRefreshCcw /> {loading ? 'Actualizando…' : 'Actualizar'}</button>
            </div>
          </div>
        </header>

        {error && <div role="alert" className="alert-error">{error}</div>}

        {/* Estado vacío */}
        {!loading && productosPorCategoria.length === 0 && (
          <section className="productos-empty">
            <div className="emoji">👜</div>
            <h3>Aún no tienes productos</h3>
            <p>Crea tu primer producto para comenzar a vender.</p>
            <button className="btn btn-primary" onClick={crearProducto}><FiPlus /> Crear producto</button>
          </section>
        )}

        {/* Grid por categorías / skeletons */}
        {loading ? (
          <section className="productos-grid">
            {Array.from({ length: 6 }).map((_, i) => (<article key={i} className="producto-card skeleton" />))}
          </section>
        ) : (
          <div className="productos-por-categoria">
            {productosPorCategoria.map((grupo) => (
              <section key={grupo.categoria.id} className="categoria-section">
                <h2 className="categoria-titulo">
                  {grupo.categoria.nombre}
                  <span className="productos-count">{grupo.productos.length} productos</span>
                </h2>

                <div className="productos-grid">
                  {grupo.productos.map((p) => {
                    const simplePrice = asNum(p.precio);
                    const hasSimplePrice = Number.isFinite(simplePrice);
                    const varDesde = asNum(p.precioDesde);
                    const varHasta = asNum(p.precioHasta);
                    const hasVarPrices = Number.isFinite(varDesde);
                    const comparativo = asNum(p.precioComparativo);
                    const descPct = asNum(p.descuentoPct);

                    return (
                      <article key={p.id} className="producto-card" data-estado={p.estado} data-destacado={p.destacado ? '1' : '0'}>
                        <figure className="producto-media">
                          <ImageCarousel images={p.imagenes} productName={p.nombre} />
                          {p.destacado && (<span className="producto-chip chip-star" title="Producto destacado"><FiStar /></span>)}
                          <span className="producto-chip chip-estado" data-estado={p.estado}>{p.estado}</span>
                        </figure>

                        <div className="producto-body">
                          <header className="producto-head">
                            <h4 className="producto-title" title={p.nombre}>{p.nombre}</h4>
                          </header>

                          <div className="producto-meta">
                            <span className="producto-slug">/{p.slug}</span>
                            <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                              👁 {p.vistas ?? 0} · 🛒 {p.ventas ?? 0}
                            </span>
                          </div>

                          {/* Precios */}
                          <div className="producto-precio">
                            {p.tipo === 'VARIANTE' ? (
                              hasVarPrices ? (
                                <span className="precio">
                                  Desde {currency(varDesde)}{(Number.isFinite(varHasta) && varHasta !== varDesde) ? ` – ${currency(varHasta)}` : ''}
                                </span>
                              ) : (<span className="badge">Con variantes</span>)
                            ) : (
                              hasSimplePrice ? (
                                <>
                                  <span className="precio">{currency(simplePrice)}</span>
                                  {Number.isFinite(comparativo) && (<span className="precio-compare">{currency(comparativo)}</span>)}
                                  {Number.isFinite(descPct) && descPct > 0 ? <span className="precio-desc">-{descPct}%</span> : null}
                                </>
                              ) : (<span className="badge">—</span>)
                            )}
                          </div>

                          <div className="producto-footer">
                            <span className="producto-stock" data-stock={calcStock(p)}>{stockText(p)}</span>
                            <div className="producto-actions">
                              <button className="icon" onClick={() => toggleEstado(p)} title={p.estado === 'ACTIVE' ? 'Pausar producto' : 'Activar producto'}>
                                {p.estado === 'ACTIVE' ? <FiPause /> : <FiPlay />}
                              </button>
                              <button className="icon" onClick={() => toggleDestacado(p)} title={p.destacado ? 'Quitar destacado' : 'Marcar como destacado'}>
                                <FiStar />
                              </button>
                              <button className="icon" onClick={() => verPublico(p)} title="Ver página pública del producto">
                                <FiEye />
                              </button>
                              <button className="icon" onClick={() => editarProducto(p)} title="Editar producto">
                                <FiEdit2 />
                              </button>

                              {/* Eliminar: lógico (normal) vs permanente (solo ARCHIVED) */}
                              {p.estado === 'ARCHIVED' ? (
                                <button
                                  className="icon danger"
                                  onClick={() => eliminarProductoPermanente(p)}
                                  title="Eliminar permanentemente (irrevocable)"
                                >
                                  <FiTrash2 />
                                </button>
                              ) : (
                                <button
                                  className="icon danger"
                                  onClick={() => eliminarProducto(p)}
                                  title="Eliminar (archivar)"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Modal Categorías */}
      {showCatModal && (
        <section className="panel-overlay" onClick={() => setShowCatModal(false)}>
          <div className="panel-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Gestión de categorías">
            <header className="panel-head">
              <h3>Categorías</h3>
              <button className="icon" onClick={() => setShowCatModal(false)} title="Cerrar"><FiX /></button>
            </header>

            <p className="panel-subtitle">Crea y organiza categorías para tu catálogo.</p>

            <div className="categorias-new">
              <input ref={refCatInput} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ej. Calzado, Postres, Electrónica…" onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()} />
              <button className="btn btn-primary" onClick={agregarCategoria}><FiPlus /> Agregar</button>
            </div>

            <ul className="categorias-lista">
              {categorias.map((c) => (
                <li key={c.id}>
                  {editCatId === c.id ? (
                    <>
                      <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarEdicionCat()} />
                      <div className="cat-actions">
                        <button className="btn btn-secondary" onClick={guardarEdicionCat}><FiCheck /> Guardar</button>
                        <button className="btn btn-ghost" onClick={() => { setEditCatId(null); setEditCatName(''); }}><FiX /> Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="cat-name">{c.nombre}</span>
                      <div className="cat-actions">
                        <button className="btn btn-ghost" onClick={() => { setEditCatId(c.id); setEditCatName(c.nombre); }}><FiEdit2 /> Renombrar</button>
                        <button className="btn btn-danger" onClick={() => eliminarCategoria(c.id)}><FiTrash2 /> Eliminar</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>

            <footer className="panel-foot">
              <button className="btn btn-ghost" onClick={() => setShowCatModal(false)}>Cerrar</button>
            </footer>
          </div>
        </section>
      )}

      {/* Modal Crear/Editar Producto */}
      {showEditor && (
        <section className="panel-overlay" onClick={() => setShowEditor(false)}>
          <form className="panel-content crear-contenido" onClick={(e) => e.stopPropagation()} onSubmit={submitEditor} aria-label={mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}>
            {/* Cabecera */}
            <header className="panel-head">
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <h3 style={{margin:0}}>{mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}</h3>
                <div style={{fontSize:'.85rem',color:'var(--text-muted)'}}>URL: <span className="producto-slug">/{computedSlug || 'nuevo-producto'}</span></div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center', flexWrap:'wrap'}}>
                <label className="check"><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /><span>Visible</span></label>
                <label className="check"><input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} /><span>Destacado</span></label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} aria-label="Estado" className="select">
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdvanced(true)} title="Opciones avanzadas"><FiSettings /> Opciones avanzadas</button>
                <button type="button" className="icon" onClick={() => setShowEditor(false)} title="Cerrar"><FiX /></button>
              </div>
            </header>

            {/* Cuerpo */}
            <div className="crear-grid" style={{alignItems:'start'}}>

              {/* Columna izquierda */}
              <div className="crear-col">
                <label className={`field ${errors.nombre ? 'has-error':''}`}>
                  <span>Nombre *</span>
                  <input ref={refProdNombre} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej. Tenis Falcon para correr" />
                  {errors.nombre && <small className="error">{errors.nombre}</small>}
                </label>

                <label className="field">
                  <span>Descripción</span>
                  <textarea rows={4} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Cuenta por qué este producto es genial, beneficios y materiales…" />
                </label>

                {/* Tipo */}
                <label className="field">
                  <span>Tipo de producto</span>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    {TIPOS.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                  </select>
                  {form.tipo !== 'SIMPLE' && (<small className="muted"><FiInfo /> El inventario de variantes/servicios/digitales se configura después.</small>)}
                  {form.tipo === 'VARIANTE' && (
                    <div style={{marginTop:'.5rem'}}>
                      {mode === 'edit' && editId
                        ? <button type="button" className="btn btn-secondary" onClick={() => openVariantesModal(editId)}><FiEdit2 /> Gestionar variantes…</button>
                        : <span className="muted">Guarda el producto para agregar variantes.</span>}
                    </div>
                  )}
                </label>

                {/* Precios */}
                <h4 className="subhead">Precios</h4>
                <div className="crear-row">
                  <label className={`field ${errors.precio ? 'has-error':''}`}>
                    <span>Precio actual{form.tipo==='SIMPLE' && ' *'}</span>
                    <input type="number" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="Ej. 129.99" />
                    {errors.precio && <small className="error">{errors.precio}</small>}
                  </label>
                  <label className="field">
                    <span>Precio antes (comparativo)</span>
                    <input type="number" step="0.01" value={form.precioComparativo} onChange={(e) => setForm({ ...form, precioComparativo: e.target.value })} placeholder="Ej. 169.99" />
                  </label>
                </div>

                <div className="crear-row">
                  <label className="field"><span>Costo (producción/compra)</span><input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="Ej. 80.00" /></label>
                  <label className="field"><span>% Descuento</span><input type="number" min="0" max="100" value={form.descuentoPct} onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })} placeholder={descuentoSugerido != null ? `${descuentoSugerido} sugerido` : 'Ej. 15'} /></label>
                </div>

                {/* KPIs */}
                <div className="kpis">
                  <div className="kpi">
                    <div className="kpi-title"><FiInfo /> Descuento sugerido</div>
                    <div className="kpi-value">{descuentoSugerido != null ? `-${descuentoSugerido}%` : '—'}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title"><FiInfo /> Margen</div>
                    <div className="kpi-value">{margen ? `${currency(margen.m)}${margen.pct != null ? ` · ${margen.pct.toFixed(0)}%` : ''}` : '—'}</div>
                  </div>
                </div>

                {/* Inventario (solo SIMPLE) */}
                {form.tipo === 'SIMPLE' && (
                  <>
                    <h4 className="subhead">Inventario</h4>
                    <div className="crear-row">
                      <label className={`field ${errors.stock ? 'has-error':''}`}>
                        <span>Stock *</span>
                        <input type="number" min="0" value={form.inventarioStock} onChange={(e) => setForm({ ...form, inventarioStock: e.target.value })} placeholder="Ej. 20" />
                        {errors.stock && <small className="error">{errors.stock}</small>}
                      </label>
                      <label className="field">
                        <span>Umbral alerta</span>
                        <input type="number" min="0" value={form.inventarioUmbral} onChange={(e) => setForm({ ...form, inventarioUmbral: e.target.value })} placeholder="Ej. 3" />
                      </label>
                    </div>
                    <label className="check">
                      <input type="checkbox" checked={form.backorder} onChange={(e) => setForm({ ...form, backorder: e.target.checked })} />
                      <span>Permitir pedidos sin stock (backorder)</span>
                    </label>
                  </>
                )}

                {/* Categorías */}
                <h4 className="subhead" style={{marginTop:'1rem'}}>Categorías</h4>
                <div className="chips">
                  {categorias.length === 0 && <span className="muted">No tienes categorías todavía.</span>}
                  {categorias.map(c => (
                    <button key={c.id} type="button" className={`chip ${form.categoriasIds.includes(c.id) ? 'active':''}`} onClick={() => toggleCategoria(c.id)}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna derecha: imágenes + preview */}
              <div className="crear-col">
                <h4 className="subhead">Imágenes</h4>
                <div className="crear-uploader" onDrop={handleDrop} onDragOver={handleDragOver}>
                  <label className="btn-file">
                    <FiUpload /> Seleccionar imágenes
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/svg+xml"
                      multiple
                      onChange={(e) => onUploadImages(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <p className="muted" style={{margin:0}}>O arrastra y suelta aquí (máx. 12)</p>

                  {form.imagenes.length > 0 ? (
                    <ul className="imgs-list">
                      {form.imagenes.map((img, idx) => (
                        <li key={idx}>
                          <img src={toPublicSrc(img)} alt={img.alt || `Imagen ${idx + 1}`} loading="lazy" decoding="async" />
                          <div className="img-actions">
                            <div style={{display:'flex', gap:6}}>
                              <button type="button" className="icon" onClick={() => moveImagen(idx, -1)} title="Mover a la izquierda"><FiChevronLeft /></button>
                              <button type="button" className="icon" onClick={() => moveImagen(idx, +1)} title="Mover a la derecha"><FiChevronRight /></button>
                              {!img.isPrincipal ? (
                                <button type="button" className="icon" onClick={() => setPrincipal(idx)} title="Marcar como principal"><FiStar /></button>
                              ) : (<span className="chip chip-principal"><FiStar /> Principal</span>)}
                            </div>
                            <button type="button" className="icon danger" onClick={() => removeImagen(idx)} title="Quitar imagen"><FiX /></button>
                          </div>
                          <input className="img-alt" value={img.alt} onChange={(e) => updateAlt(idx, e.target.value)} placeholder="Texto alternativo (accesibilidad/SEO)" />
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="muted">Aún no has subido imágenes.</p>)}
                </div>

                {/* Preview */}
                <h4 className="subhead">Vista previa</h4>
                <article className="producto-card preview" data-estado={form.estado} data-destacado={form.destacado ? '1' : '0'}>
                  <figure className="producto-media">
                    {form.imagenes?.length ? (<ImageCarousel images={form.imagenes} productName={form.nombre || 'Producto'} />) : (<div className="producto-media-empty"><span>Sin imágenes</span></div>)}
                    {form.destacado && (<span className="producto-chip chip-star" title="Producto destacado"><FiStar /></span>)}
                    <span className="producto-chip chip-estado" data-estado={form.estado}>{form.estado}</span>
                  </figure>
                  <div className="producto-body">
                    <header className="producto-head">
                      <h4 className="producto-title" title={form.nombre || 'Nuevo producto'}>{form.nombre || 'Nuevo producto'}</h4>
                    </header>
                    <div className="producto-meta">
                      <span className="producto-slug">/{computedSlug || 'nuevo-producto'}</span>
                    </div>
                    <div className="producto-precio">
                      {precioNum != null ? (
                        <>
                          <span className="precio">{currency(precioNum)}</span>
                          {precioCompNum != null && (<span className="precio-compare">{currency(precioCompNum)}</span>)}
                          {form.descuentoPct ? <span className="precio-desc">-{form.descuentoPct}%</span> : (descuentoSugerido != null ? <span className="precio-desc">-{descuentoSugerido}%</span> : null)}
                        </>
                      ) : (
                        <span className="badge">{form.tipo === 'SIMPLE' ? 'Definir precio' : 'Con variantes'}</span>
                      )}
                    </div>
                    <div className="producto-footer">
                      <span className="producto-stock" data-stock={form.tipo === 'SIMPLE' ? (Number(form.inventarioStock || 0)) : 0}>
                        {form.tipo === 'SIMPLE' ? (Number(form.inventarioStock || 0) > 0 ? `En stock: ${form.inventarioStock}` : 'Sin stock') : '—'}
                      </span>
                      <div className="producto-actions">
                        <button className="icon" type="button" title="Vista pública"><FiEye /></button>
                        <button className="icon" type="button" title="Marcar como destacado"><FiStar /></button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <footer className="panel-foot crear-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowEditor(false)} disabled={saving}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !form.nombre.trim()} title={!form.nombre.trim() ? 'Completa el nombre' : undefined}>
                {saving ? 'Guardando…' : (<><FiCheck /> {mode === 'edit' ? 'Guardar cambios' : 'Guardar producto'}</>)}
              </button>
            </footer>
          </form>
        </section>
      )}

      {/* Modal: OPCIONES AVANZADAS */}
      {showEditor && showAdvanced && (
        <section className="panel-overlay" onClick={() => setShowAdvanced(false)}>
          <div className="panel-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Opciones avanzadas del producto">
            <header className="panel-head">
              <h3><FiSettings /> Opciones avanzadas</h3>
              <button className="icon" onClick={() => setShowAdvanced(false)} title="Cerrar"><FiX /></button>
            </header>

            <div className="crear-grid" style={{alignItems:'start'}}>
              <div className="crear-col">
                <h4 className="subhead">Identificación</h4>
                <div className="crear-row">
                  <label className="field"><span>SKU</span><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Código interno" /></label>
                  <label className="field"><span>GTIN (EAN/UPC)</span><input value={form.gtin} onChange={(e) => setForm({ ...form, gtin: e.target.value })} placeholder="Código de barras" /></label>
                </div>
                <div className="crear-row">
                  <label className="field"><span>Marca</span><input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ej. MiMarca" /></label>
                  <label className="field">
                    <span>Condición</span>
                    <input list="cond-list" value={form.condicion} onChange={(e) => setForm({ ...form, condicion: e.target.value })} placeholder="NUEVO / USADO / REACONDICIONADO" />
                    <datalist id="cond-list">
                      <option value="NUEVO" />
                      <option value="USADO" />
                      <option value="REACONDICIONADO" />
                    </datalist>
                  </label>
                </div>

                <h4 className="subhead">Envío y dimensiones</h4>
                <div className="crear-row">
                  <label className="field"><span>Peso (g)</span><input type="number" min="0" value={form.pesoGramos} onChange={(e) => setForm({ ...form, pesoGramos: e.target.value })} /></label>
                  <label className="field"><span>Clase de envío</span><input value={form.claseEnvio} onChange={(e) => setForm({ ...form, claseEnvio: e.target.value })} placeholder="ligero / frágil / oversize" /></label>
                </div>
                <div className="crear-row">
                  <label className="field"><span>Alto (cm)</span><input type="number" step="0.01" value={form.altoCm} onChange={(e) => setForm({ ...form, altoCm: e.target.value })} /></label>
                  <label className="field"><span>Ancho (cm)</span><input type="number" step="0.01" value={form.anchoCm} onChange={(e) => setForm({ ...form, anchoCm: e.target.value })} /></label>
                </div>
                <div className="crear-row">
                  <label className="field"><span>Largo (cm)</span><input type="number" step="0.01" value={form.largoCm} onChange={(e) => setForm({ ...form, largoCm: e.target.value })} /></label>
                  <label className="field"><span>Días de preparación</span><input type="number" min="0" value={form.diasPreparacion} onChange={(e) => setForm({ ...form, diasPreparacion: e.target.value })} /></label>
                </div>
              </div>

              <div className="crear-col">
                <h4 className="subhead">Políticas y digital</h4>
                <label className="field"><span>Política de devolución</span><textarea rows={4} value={form.politicaDevolucion} onChange={(e) => setForm({ ...form, politicaDevolucion: e.target.value })} placeholder="Describe condiciones de devolución, cambios, etc." /></label>

                {form.tipo === 'DIGITAL' && (
                  <label className="field"><span>URL de archivo digital</span><input value={form.digitalUrl} onChange={(e) => setForm({ ...form, digitalUrl: e.target.value })} placeholder="/TiendaUploads/tienda-1/productos/manual.pdf" /></label>
                )}

                <h4 className="subhead">Licenciamiento</h4>
                <label className="check"><input type="checkbox" checked={form.licOriginal} onChange={(e) => setForm({ ...form, licOriginal: e.target.checked })} /><span>Es diseño/obra original del vendedor</span></label>
                <label className="field"><span>Notas de licenciamiento (opcional)</span><input value={form.licNotas} onChange={(e) => setForm({ ...form, licNotas: e.target.value })} placeholder="Información adicional sobre derechos/autorizaciones" /></label>
              </div>
            </div>

            <footer className="panel-foot">
              <button className="btn btn-ghost" onClick={() => setShowAdvanced(false)}>Cerrar</button>
              <button className="btn btn-secondary" onClick={() => setShowAdvanced(false)}><FiCheck /> Listo</button>
            </footer>
          </div>
        </section>
      )}

      {/* Sub-modal Variantes */}
      {showVariantes && (
        <section className="panel-overlay" onClick={() => setShowVariantes(false)}>
          <div className="panel-content variantes-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Gestión de variantes">
            <header className="panel-head">
              <div>
                <h3 style={{margin:0}}>Variantes de {form.nombre || 'Producto'}</h3>
                <p className="panel-subtitle" style={{marginTop:4}}>Crea combinaciones (talla, color, etc.), precios y stock por variante.</p>
              </div>
              <button className="icon" onClick={() => setShowVariantes(false)} title="Cerrar"><FiX /></button>
            </header>

            <div className="variantes-grid">
              {/* Lista */}
              <div className="variantes-list">
                <div className="list-head">
                  <strong>Variantes</strong>
                  <button className="btn btn-secondary" onClick={vStartCreate}><FiPlus /> Nueva variante</button>
                </div>

                {vError && <div className="alert-error" role="alert">{vError}</div>}
                {vLoading ? (
                  <div className="muted">Cargando…</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Nombre / Opciones</th>
                        <th style={{textAlign:'right'}}>Precio</th>
                        <th style={{textAlign:'right'}}>Stock</th>
                        <th style={{width:120}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vList.length === 0 ? (
                        <tr><td colSpan={5}><span className="muted">Sin variantes aún.</span></td></tr>
                      ) : vList.map(v => (
                        <tr key={v.id}>
                          <td>{v.sku || '—'}</td>
                          <td>
                            <div style={{fontWeight:600}}>{v.nombre || '—'}</div>
                            {v.opciones ? (<small className="muted">{safeStringify(v.opciones)}</small>) : <small className="muted">—</small>}
                          </td>
                          <td style={{textAlign:'right'}}>{Number.isFinite(asNum(v.precio)) ? currency(asNum(v.precio)) : '—'}</td>
                          <td style={{textAlign:'right'}}>{Number.isFinite(asNum(v?.inventario?.stock)) ? asNum(v?.inventario?.stock) : 0}</td>
                          <td>
                            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                              <button className="btn btn-ghost" onClick={() => vStartEdit(v)}><FiEdit2 /> Editar</button>
                              <button className="btn btn-danger" onClick={() => eliminarVariante(v)}><FiTrash2 /> Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Formulario */}
              <form className="variantes-form" onSubmit={submitVariante}>
                <h4 style={{marginTop:0}}>{vMode === 'edit' ? 'Editar variante' : 'Nueva variante'}</h4>

                <div className="crear-row">
                  <label className="field"><span>SKU</span><input value={vForm.sku} onChange={(e) => setVForm({ ...vForm, sku: e.target.value })} placeholder="Ej. FALCON-ROJO-M" /></label>
                  <label className="field"><span>Nombre</span><input value={vForm.nombre} onChange={(e) => setVForm({ ...vForm, nombre: e.target.value })} placeholder="Ej. Rojo / M" /></label>
                </div>

                <label className="field"><span>Opciones (JSON)</span><input value={vForm.opcionesText} onChange={(e) => setVForm({ ...vForm, opcionesText: e.target.value })} placeholder='Ej. {"talla":"M","color":"Rojo"}' /></label>

                <div className="crear-row">
                  <label className="field"><span>Precio</span><input type="number" step="0.01" value={vForm.precio} onChange={(e) => setVForm({ ...vForm, precio: e.target.value })} /></label>
                  <label className="field"><span>Precio comparativo</span><input type="number" step="0.01" value={vForm.precioComparativo} onChange={(e) => setVForm({ ...vForm, precioComparativo: e.target.value })} /></label>
                </div>

                <div className="crear-row">
                  <label className="field"><span>Costo</span><input type="number" step="0.01" value={vForm.costo} onChange={(e) => setVForm({ ...vForm, costo: e.target.value })} /></label>
                  <label className="field"><span>Stock</span><input type="number" min="0" value={vForm.stock} onChange={(e) => setVForm({ ...vForm, stock: e.target.value })} /></label>
                </div>

                <div className="crear-row">
                  <label className="field"><span>Umbral alerta</span><input type="number" min="0" value={vForm.umbral} onChange={(e) => setVForm({ ...vForm, umbral: e.target.value })} /></label>
                  <label className="check" style={{marginTop:28}}><input type="checkbox" checked={vForm.backorder} onChange={(e) => setVForm({ ...vForm, backorder: e.target.checked })} /><span>Permitir backorder</span></label>
                </div>

                <h4 className="subhead">Imágenes de variante</h4>
                <div className="crear-uploader" onDragOver={(e)=>{e.preventDefault();}} onDrop={(e)=>{e.preventDefault(); onUploadVImages(e.dataTransfer?.files);}}>
                  <label className="btn-file">
                    <FiUpload /> Subir imágenes
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/svg+xml"
                      multiple
                      onChange={(e) => onUploadVImages(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {vForm.imagenes.length > 0 ? (
                    <ul className="imgs-list">
                      {vForm.imagenes.map((img, idx) => (
                        <li key={idx}>
                          <img src={toPublicSrc(img)} alt={img.alt || `var-${idx}`} loading="lazy" decoding="async" />
                          <div className="img-actions">
                            <div style={{display:'flex', gap:6}}>
                              <button type="button" className="icon" onClick={() => moveVImagen(idx, -1)} title="Mover a la izquierda"><FiChevronLeft /></button>
                              <button type="button" className="icon" onClick={() => moveVImagen(idx, +1)} title="Mover a la derecha"><FiChevronRight /></button>
                            </div>
                            <button type="button" className="icon danger" onClick={() => removeVImagen(idx)} title="Quitar"><FiX /></button>
                          </div>
                          <input className="img-alt" value={img.alt} onChange={(e) => updateVAlt(idx, e.target.value)} placeholder="Texto alternativo" />
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="muted">Aún no has subido imágenes para esta variante.</p>)}
                </div>

                <div style={{display:'flex',gap:8,justifyContent:'flex-end', marginTop:12}}>
                  {vMode === 'edit' && (<button type="button" className="btn btn-ghost" onClick={vStartCreate}><FiX /> Cancelar edición</button>)}
                  <button type="submit" className="btn btn-primary" disabled={vSaving}>
                    {vSaving ? 'Guardando…' : (<><FiCheck /> {vMode === 'edit' ? 'Guardar variante' : 'Agregar variante'}</>)}
                  </button>
                </div>
              </form>
            </div>

            <footer className="panel-foot">
              <button className="btn btn-ghost" onClick={() => setShowVariantes(false)}>Cerrar</button>
              <button className="btn btn-secondary" onClick={refreshProductoLocal}><FiRefreshCcw /> Actualizar</button>
            </footer>
          </div>
        </section>
      )}
    </div>
  );
}
