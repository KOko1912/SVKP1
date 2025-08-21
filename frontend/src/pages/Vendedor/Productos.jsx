// frontend/src/pages/Vendedor/Productos.jsx
import { useEffect, useMemo, useState } from 'react';
import Nabvendedor from './Nabvendedor';
import {
  FiPlus, FiRefreshCcw, FiSearch, FiTag, FiEdit2, FiTrash2,
  FiEye, FiStar, FiUpload, FiX, FiCheck, FiPause, FiPlay,
  FiChevronLeft, FiChevronRight, FiInfo
} from 'react-icons/fi';
import './Productos.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const FILES = import.meta.env.VITE_FILES_BASE || API;

/* -------------------- Tipos de producto (explicación) -------------------- */
const TIPOS = [
  {
    value: 'SIMPLE',
    label: 'Simple',
    desc: 'Un solo SKU con precio y stock únicos.',
    badges: ['Inventario', 'Precio único'],
    supports: { inventory: true, variants: false, digital: false, service: false, bundle: false },
  },
  {
    value: 'VARIANTE',
    label: 'Con variantes',
    desc: 'Varias combinaciones (talla, color…). Inventario por variante.',
    badges: ['Variantes', 'Precios por variante'],
    supports: { inventory: false, variants: true, digital: false, service: false, bundle: false },
  },
  {
    value: 'DIGITAL',
    label: 'Digital',
    desc: 'Archivo descargable (no requiere stock).',
    badges: ['Descargable'],
    supports: { inventory: false, variants: false, digital: true, service: false, bundle: false },
  },
  {
    value: 'SERVICIO',
    label: 'Servicio',
    desc: 'Reservas/citas; precio por sesión.',
    badges: ['Agenda'],
    supports: { inventory: false, variants: false, digital: false, service: true, bundle: false },
  },
  {
    value: 'BUNDLE',
    label: 'Bundle',
    desc: 'Paquete de varios productos (combos).',
    badges: ['Pack'],
    supports: { inventory: false, variants: false, digital: false, service: false, bundle: true },
  },
];

/* -------------------- helpers de tema -------------------- */
const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;
const hexToRgb = (hex) => {
  const m = hex?.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};
const luminance = ([r, g, b]) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const bestTextOn = (hexA, hexB) => {
  const L = (luminance(hexToRgb(hexA)) + luminance(hexToRgb(hexB))) / 2;
  return L > 0.45 ? '#111111' : '#ffffff';
};
const extractColors = (gradientString) => {
  const m = gradientString?.match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || '#6d28d9', to: m?.[1] || '#c026d3' };
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
    <div className="producto-media-carousel">
      <button className="carousel-btn prev" onClick={prevImage}><FiChevronLeft /></button>
      <img
        src={`${FILES}${images[currentIndex].url}`}
        alt={`${productName} - Imagen ${currentIndex + 1}`}
        className="carousel-image"
      />
      <button className="carousel-btn next" onClick={nextImage}><FiChevronRight /></button>
      <div className="carousel-dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
            aria-label={`Ir a imagen ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default function Productos() {
  /* -------------------- estado base -------------------- */
  const [tiendaId, setTiendaId] = useState(null);
  const [theme, setTheme] = useState({ from: '#6d28d9', to: '#c026d3', contrast: '#ffffff' });

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
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  /* -------- Variantes (sub-modal) -------- */
  const [showVariantes, setShowVariantes] = useState(false);
  const [vList, setVList] = useState([]);           // variantes del producto actual
  const [vLoading, setVLoading] = useState(false);
  const [vError, setVError] = useState('');
  const [vMode, setVMode] = useState('create');     // create | edit
  const [vEditId, setVEditId] = useState(null);     // id de variante al editar
  const [vSaving, setVSaving] = useState(false);
  const [vForm, setVForm] = useState(defaultVForm());

  /* -------------------- offsets navbar móvil -------------------- */
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const mobileTopOffset = 'calc(60px + env(safe-area-inset-top, 0px))';
  const mobileBottomOffset = 'calc(72px + env(safe-area-inset-bottom, 0px))';

  /* -------------------- auth headers -------------------- */
  const usuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; }
  })();
  const token = localStorage.getItem('token');
  const baseHeaders = {
    ...(usuario?.id ? { 'x-user-id': usuario.id } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  /* -------------------- tema brand -------------------- */
  useEffect(() => {
    document.body.classList.add('vendor-theme');
    (async () => {
      try {
        const r = await fetch(`${API}/api/tienda/me`, { headers: baseHeaders });
        const d = await r.json();
        if (r.ok && d) {
          const { from, to } = extractColors(d.colorPrincipal || grad('#6d28d9', '#c026d3'));
          const contrast = bestTextOn(from, to);
          setTheme({ from, to, contrast });
          const root = document.documentElement.style;
          root.setProperty('--brand-from', from);
          root.setProperty('--brand-to', to);
          root.setProperty('--brand-contrast', contrast);
          root.setProperty('--brand-gradient', grad(from, to));
          root.setProperty('--primary-color', from);
          root.setProperty('--primary-hover', from);
          const [rC, gC, bC] = hexToRgb(from);
          root.setProperty('--primary-color-rgb', `${rC}, ${gC}, ${bC}`);
          const halos = `radial-gradient(900px 600px at 0% -10%, ${from}22, transparent 60%),
                         radial-gradient(900px 600px at 100% -10%, ${to}22, transparent 60%)`;
          root.setProperty('--page-bg', `${halos}, linear-gradient(135deg, ${from}, ${to})`);
          localStorage.setItem('brandFrom', from);
          localStorage.setItem('brandTo', to);
          localStorage.setItem('brandContrast', contrast);
        }
      } catch { /* tema por defecto */ }
    })();
    return () => document.body.classList.remove('vendor-theme');
  }, []);

  /* -------------------- helpers -------------------- */
  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  function calcStock(p) {
    if (p?.inventario) return p.inventario.stock ?? 0;
    if (Array.isArray(p?.variantes)) {
      return p.variantes.reduce((acc, v) => acc + (v?.inventario?.stock ?? 0), 0);
    }
    return 0;
  }
  function stockText(p) {
    const s = calcStock(p);
    const umbral = p?.inventario?.umbralAlerta ?? 3;
    if (s <= 0) return 'Sin stock';
    if (s <= umbral) return `Stock bajo (${s})`;
    return `En stock: ${s}`;
  }
  function currency(n) {
    if (typeof n !== 'number') return '';
    try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n); }
    catch { return `$${n.toFixed(2)}`; }
  }

  /* -------------------- asegurar tienda -------------------- */
  useEffect(() => {
    const localTiendaId = usuario?.tiendaId ?? usuario?.tienda?.id ?? null;
    if (localTiendaId) setTiendaId(Number(localTiendaId));
    if (!localTiendaId) {
      (async () => {
        try {
          const r = await fetch(`${API}/api/tienda/me`, { headers: baseHeaders });
          if (!r.ok) throw new Error('No se encontró tu tienda. Configúrala en el perfil.');
          const d = await r.json();
          if (d?.id) {
            setTiendaId(Number(d.id));
            try {
              const u = JSON.parse(localStorage.getItem('usuario') || '{}');
              localStorage.setItem('usuario', JSON.stringify({ ...u, tienda: d }));
            } catch {}
          }
        } catch (e) { setError(e.message || 'No se encontró tu tienda. Ve a Configuración → Perfil.'); }
      })();
    }
  }, []);

  /* -------------------- cargar categorías -------------------- */
  useEffect(() => {
    if (!tiendaId) return;
    (async () => {
      setCargandoCats(true);
      try {
        const res = await fetch(`${API}/api/v1/categorias?tiendaId=${tiendaId}`, { headers: baseHeaders });
        if (!res.ok) throw new Error('No se pudieron cargar las categorías');
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn(e?.message || e);
        setCategorias((prev) => (prev.length ? prev : []));
      } finally { setCargandoCats(false); }
    })();
  }, [tiendaId]);

  /* -------------------- cargar productos -------------------- */
  const cargar = async () => {
    if (!tiendaId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('tiendaId', String(tiendaId));
      if (q.trim()) params.set('q', q.trim());
      if (estadoSel) params.set('estado', estadoSel);
      if (categoriaSel && categoriaSel !== 'todas') params.set('categoria', categoriaSel);
      const res = await fetch(`${API}/api/v1/productos?${params.toString()}`, { headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudieron cargar los productos');
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Ocurrió un error al actualizar.');
    } finally { setLoading(false); }
  };
  useEffect(() => { if (tiendaId) cargar(); }, [tiendaId, q, categoriaSel, estadoSel]);

  /* -------------------- organizar productos por categoría -------------------- */
  const productosPorCategoria = useMemo(() => {
    const productosFiltrados = productos.filter((p) => {
      const term = q.trim().toLowerCase();
      if (categoriaSel !== 'todas') {
        const tieneCat =
          p?.categoria?.slug === categoriaSel ||
          (Array.isArray(p?.categorias) && p.categorias.some((pc) => pc?.categoria?.slug === categoriaSel));
        if (!tieneCat) return false;
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
      return [{
        categoria: categorias.find(c => c.slug === categoriaSel) || { id: -1, nombre: 'Seleccionados' },
        productos: productosFiltrados
      }];
    }
    const categoriasConProductos = categorias.map(cat => ({
      categoria: cat,
      productos: productosFiltrados.filter(p =>
        p?.categoria?.id === cat.id ||
        p?.categorias?.some(pc => pc.categoriaId === cat.id)
      )
    }));
    const productosSinCategoria = productosFiltrados.filter(p =>
      !p?.categoria?.id && (!p?.categorias || p.categorias.length === 0)
    );
    if (productosSinCategoria.length > 0) {
      categoriasConProductos.push({
        categoria: { id: 0, nombre: 'Sin categoría', slug: 'sin-categoria' },
        productos: productosSinCategoria
      });
    }
    return categoriasConProductos.filter(g => g.productos.length > 0);
  }, [productos, categorias, q, categoriaSel, estadoSel]);

  /* -------------------- acciones productos -------------------- */
  const crearProducto = () => { setMode('create'); setEditId(null); setForm(defaultForm()); setErrors({}); setShowEditor(true); };
  const productToForm = (p) => {
    const catIds = Array.isArray(p?.categorias)
      ? p.categorias.map((x) => x?.categoriaId ?? x?.categoria?.id ?? x?.id).filter(Boolean)
      : p?.categoriaId ? [p.categoriaId] : [];
    return {
      nombre: p?.nombre || '', descripcion: p?.descripcion || '', tipo: p?.tipo || 'SIMPLE',
      estado: p?.estado || 'DRAFT', visible: !!p?.visible, destacado: !!p?.destacado,
      precio: typeof p?.precio === 'number' ? p.precio : '', precioComparativo: typeof p?.precioComparativo === 'number' ? p.precioComparativo : '',
      costo: typeof p?.costo === 'number' ? p.costo : '', descuentoPct: typeof p?.descuentoPct === 'number' ? p.descuentoPct : '',
      inventarioStock: typeof p?.inventario?.stock === 'number' ? p.inventario.stock : '',
      inventarioUmbral: typeof p?.inventario?.umbralAlerta === 'number' ? p.inventario.umbralAlerta : 3,
      backorder: !!p?.inventario?.permitirBackorder,
      categoriasIds: catIds,
      imagenes: Array.isArray(p?.imagenes)
        ? p.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || '', isPrincipal: !!m.isPrincipal, orden: typeof m.orden === 'number' ? m.orden : i }))
        : [],
    };
  };
  const editarProducto = (p) => { setMode('edit'); setEditId(p.id); setForm(productToForm(p)); setErrors({}); setShowEditor(true); };
  const verPublico = (p) => window.open(`/usuario/producto/${p.uuid || p.id}`, '_blank');
  const eliminarProducto = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar');
      setProductos((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) { alert(e?.message || 'Error al eliminar'); }
  };
  const toggleEstado = async (p) => {
    const next = p.estado === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`${API}/api/v1/productos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ estado: next }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar el estado');
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
      if (!res.ok) throw new Error('No se pudo actualizar destacado');
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ tiendaId, nombre }),
      });
      if (!res.ok) throw new Error('No se pudo crear la categoría');
      const creada = await res.json();
      setCategorias((prev) => [creada, ...prev]);
      setNewCatName('');
    } catch (e) { alert(e?.message || 'Error al crear categoría'); }
  };
  const guardarEdicionCat = async () => {
    const nombre = editCatName.trim();
    if (!nombre || !editCatId) return;
    try {
      const res = await fetch(`${API}/api/v1/categorias/${editCatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) throw new Error('No se pudo renombrar la categoría');
      const act = await res.json();
      setCategorias((prev) => prev.map((c) => (c.id === act.id ? act : c)));
      setEditCatId(null); setEditCatName('');
    } catch (e) { alert(e?.message || 'Error al renombrar categoría'); }
  };
  const eliminarCategoria = async (id) => {
    if (!confirm('¿Eliminar categoría? Los productos no se borran.')) return;
    try {
      const res = await fetch(`${API}/api/v1/categorias/${id}`, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo eliminar la categoría');
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      if (categoriaSel !== 'todas' && categorias.find((c) => c.id === id)?.slug === categoriaSel) {
        setCategoriaSel('todas');
      }
    } catch (e) { alert(e?.message || 'Error al eliminar categoría'); }
  };

  /* -------------------- editor (crear/editar) -------------------- */
  function defaultForm() {
    return {
      nombre: '',
      descripcion: '',
      tipo: 'SIMPLE',
      estado: 'DRAFT',
      visible: true,
      destacado: false,
      precio: '',
      precioComparativo: '',
      costo: '',
      descuentoPct: '',
      inventarioStock: '',
      inventarioUmbral: 3,
      backorder: false,
      categoriasIds: [],
      imagenes: [],
    };
  }

  const precioNum = useMemo(() => (form.precio === '' ? null : Number(form.precio)), [form.precio]);
  const precioCompNum = useMemo(() => (form.precioComparativo === '' ? null : Number(form.precioComparativo)), [form.precioComparativo]);
  const costoNum = useMemo(() => (form.costo === '' ? null : Number(form.costo)), [form.costo]);
  const descuentoSugerido = useMemo(() => {
    if (precioNum != null && precioCompNum && precioCompNum > 0) {
      return Math.max(0, Math.round((1 - (precioNum / precioCompNum)) * 100));
    }
    return null;
  }, [precioNum, precioCompNum]);
  const margen = useMemo(() => {
    if (precioNum != null && costoNum != null) {
      const m = precioNum - costoNum;
      const pct = costoNum > 0 ? (m / costoNum) * 100 : null;
      return { m, pct };
    }
    return null;
  }, [precioNum, costoNum]);
  const computedSlug = useMemo(() => slugify(form.nombre), [form.nombre]);

  /* -------------------- imágenes producto -------------------- */
  const onUploadImages = async (files) => {
    if (!files?.length) return;
    if (!tiendaId) { alert('No se encontró tu tienda. Ve a Configuración → Perfil.'); return; }
    const uploads = Array.from(files).slice(0, 12 - form.imagenes.length); // máximo 12
    for (const f of uploads) {
      try {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch(`${API}/api/v1/upload/producto`, { method: 'POST', headers: { ...baseHeaders }, body: fd });
        if (!res.ok) throw new Error('No se pudo subir imagen');
        const { url } = await res.json();
        setForm((prev) => {
          const next = [...prev.imagenes];
          next.push({ url, alt: '', isPrincipal: next.length === 0, orden: next.length });
          return { ...prev, imagenes: next };
        });
      } catch (e) { alert(e?.message || 'Error subiendo imagen'); }
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
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[j];
      arr[j] = tmp;
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
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); const files = e.dataTransfer?.files; if (files?.length) onUploadImages(files); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

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
      if (form.precio === '' || Number.isNaN(Number(form.precio))) errs.precio = 'Precio requerido.';
      if (form.inventarioStock === '' || Number.isNaN(Number(form.inventarioStock))) errs.stock = 'Stock requerido.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const submitEditor = async (e) => {
    e.preventDefault();
    if (!tiendaId) { alert('No se encontró tu tienda. Ve a Configuración → Perfil.'); return; }
    if (!validate()) return;

    const payload = {
      tiendaId,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      estado: form.estado,
      visible: !!form.visible,
      destacado: !!form.destacado,
      precio: form.precio === '' ? null : Number(form.precio),
      precioComparativo: form.precioComparativo === '' ? null : Number(form.precioComparativo),
      costo: form.costo === '' ? null : Number(form.costo),
      descuentoPct: form.descuentoPct === '' ? null : Number(form.descuentoPct),
      categoriasIds: form.categoriasIds,
      imagenes: form.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || null, isPrincipal: !!m.isPrincipal, orden: i })),
      // Inventario solo cuando es SIMPLE
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
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'No se pudo guardar el producto');
      }
      const data = await res.json();
      setShowEditor(false); setForm(defaultForm()); setEditId(null);
      setErrors({});
      if (mode === 'edit') setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
      else setProductos((prev) => [data, ...prev]);
    } catch (e) {
      alert(e?.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Variantes: helpers y API -------------------- */
  function defaultVForm() {
    return {
      sku: '',
      nombre: '',
      opcionesText: '', // JSON como texto: {"talla":"M","color":"Rojo"}
      precio: '',
      precioComparativo: '',
      costo: '',
      stock: '',
      umbral: 0,
      backorder: false,
      imagenes: [], // {url, alt, orden}
    };
  }

  const openVariantesModal = async (productoId) => {
    if (!productoId) return;
    setVError('');
    setVLoading(true);
    setShowVariantes(true);
    try {
      const res = await fetch(`${API}/api/v1/productos/${productoId}`, { headers: baseHeaders });
      if (!res.ok) throw new Error('No se pudo cargar el producto');
      const data = await res.json();
      setVList(Array.isArray(data?.variantes) ? data.variantes : []);
      // también refrescamos el producto en listado (stockTotal, precioDesde/hasta ya vienen del back)
      setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch (e) {
      setVError(e?.message || 'Error al cargar variantes');
    } finally {
      setVLoading(false);
    }
  };

  const refreshProductoLocal = async () => {
    if (!editId) return;
    try {
      const res = await fetch(`${API}/api/v1/productos/${editId}`, { headers: baseHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setVList(Array.isArray(data?.variantes) ? data.variantes : []);
      setProductos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch {/* noop */}
  };

  const vStartCreate = () => {
    setVMode('create');
    setVEditId(null);
    setVForm(defaultVForm());
  };

  const vStartEdit = (v) => {
    setVMode('edit');
    setVEditId(v.id);
    setVForm({
      sku: v.sku || '',
      nombre: v.nombre || '',
      opcionesText: v.opciones ? safeStringify(v.opciones) : '',
      precio: typeof v.precio === 'number' ? String(v.precio) : '',
      precioComparativo: typeof v.precioComparativo === 'number' ? String(v.precioComparativo) : '',
      costo: typeof v.costo === 'number' ? String(v.costo) : '',
      stock: typeof v?.inventario?.stock === 'number' ? String(v.inventario.stock) : '',
      umbral: typeof v?.inventario?.umbralAlerta === 'number' ? Number(v.inventario.umbralAlerta) : 0,
      backorder: !!v?.inventario?.permitirBackorder,
      imagenes: Array.isArray(v?.imagenes) ? v.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || '', orden: typeof m.orden === 'number' ? m.orden : i })) : [],
    });
  };

  function safeStringify(obj) {
    try { return JSON.stringify(obj); } catch { return ''; }
  }
  function parseOpciones(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    try {
      const o = JSON.parse(t);
      return (o && typeof o === 'object') ? o : null;
    } catch {
      return null;
    }
  }

  const submitVariante = async (e) => {
    e.preventDefault();
    if (!editId) { alert('Primero guarda el producto.'); return; }
    const payload = {
      sku: vForm.sku || null,
      nombre: vForm.nombre || null,
      opciones: parseOpciones(vForm.opcionesText),
      precio: vForm.precio === '' ? null : Number(vForm.precio),
      precioComparativo: vForm.precioComparativo === '' ? null : Number(vForm.precioComparativo),
      costo: vForm.costo === '' ? null : Number(vForm.costo),
      inventario: vForm.stock === '' && vMode === 'create' && vForm.umbral === 0 && !vForm.backorder
        ? null
        : {
            stock: vForm.stock === '' ? 0 : Number(vForm.stock),
            umbralAlerta: Number(vForm.umbral || 0),
            permitirBackorder: !!vForm.backorder,
          },
      imagenes: vForm.imagenes.map((m, i) => ({ url: m.url, alt: m.alt || null, orden: i })),
    };

    try {
      setVSaving(true);
      let res, data;
      if (vMode === 'edit' && vEditId) {
        res = await fetch(`${API}/api/v1/variantes/${vEditId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('No se pudo actualizar la variante');
        data = await res.json();
      } else {
        res = await fetch(`${API}/api/v1/productos/${editId}/variantes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...baseHeaders },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('No se pudo crear la variante');
        data = await res.json();
      }

      // refrescar lista desde el servidor (para recalcular stockTotal, precioDesde/Hasta)
      await refreshProductoLocal();
      // limpiar formulario a crear de nuevo
      setVForm(defaultVForm());
      setVMode('create');
      setVEditId(null);
    } catch (e2) {
      alert(e2?.message || 'Error al guardar variante');
    } finally {
      setVSaving(false);
    }
  };

  const eliminarVariante = async (v) => {
    if (!confirm(`¿Eliminar variante "${v.nombre || v.sku || v.id}"?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/variantes/${v.id}`, {
        method: 'DELETE',
        headers: baseHeaders,
      });
      if (!res.ok) throw new Error('No se pudo eliminar la variante');
      await refreshProductoLocal();
      if (vEditId === v.id) vStartCreate();
    } catch (e) {
      alert(e?.message || 'Error al eliminar variante');
    }
  };

  /* -------------------- imágenes de variante -------------------- */
  const onUploadVImages = async (files) => {
    if (!files?.length) return;
    if (!tiendaId) { alert('No se encontró tu tienda. Ve a Configuración → Perfil.'); return; }
    const uploads = Array.from(files).slice(0, 12 - vForm.imagenes.length);
    for (const f of uploads) {
      try {
        const fd = new FormData();
        fd.append('file', f);
        const res = await fetch(`${API}/api/v1/upload/producto`, { method: 'POST', headers: { ...baseHeaders }, body: fd });
        if (!res.ok) throw new Error('No se pudo subir imagen');
        const { url } = await res.json();
        setVForm((prev) => {
          const next = [...prev.imagenes];
          next.push({ url, alt: '', orden: next.length });
          return { ...prev, imagenes: next };
        });
      } catch (e) { alert(e?.message || 'Error subiendo imagen'); }
    }
  };
  const moveVImagen = (idx, dir = -1) => {
    setVForm((prev) => {
      const arr = [...prev.imagenes];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[j];
      arr[j] = tmp;
      arr.forEach((img, i) => (img.orden = i));
      return { ...prev, imagenes: arr };
    });
  };
  const removeVImagen = (idx) => {
    setVForm((prev) => {
      const arr = prev.imagenes.filter((_, i) => i !== idx).map((m, i) => ({ ...m, orden: i }));
      return { ...prev, imagenes: arr };
    });
  };
  const updateVAlt = (idx, alt) => {
    setVForm((prev) => {
      const arr = [...prev.imagenes];
      if (!arr[idx]) return prev;
      arr[idx] = { ...arr[idx], alt };
      return { ...prev, imagenes: arr };
    });
  };

  /* -------------------- render -------------------- */
  return (
    <div
      className="productos-page"
      style={{
        paddingTop: isMobile ? mobileTopOffset : undefined,
        paddingBottom: isMobile ? mobileBottomOffset : undefined,
      }}
    >
      <Nabvendedor />

      <main className="productos-main">
        {/* Toolbar */}
        <header className="productos-toolbar">
          <div className="toolbar-card">
            <div className="productos-header">
              <h1>Productos</h1>
              <p>Administra tu catálogo. Crea categorías y mantén todo ordenado.</p>
            </div>

            <div className="productos-actions">
              <label className="buscar" aria-label="Buscar">
                <FiSearch className="i" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, slug o SKU…"
                  aria-label="Buscar productos"
                />
              </label>

              <select
                value={categoriaSel}
                onChange={(e) => setCategoriaSel(e.target.value)}
                aria-label="Filtrar por categoría"
                disabled={cargandoCats}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.slug}>{c.nombre}</option>
                ))}
              </select>

              <select
                value={estadoSel}
                onChange={(e) => setEstadoSel(e.target.value)}
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="DRAFT">Borrador</option>
                <option value="PAUSED">Pausado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>

              <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}>
                <FiTag /> Gestionar categorías
              </button>

              <button className="btn btn-primary" onClick={crearProducto}>
                <FiPlus /> Nuevo producto
              </button>

              <button className="btn btn-ghost" onClick={cargar} disabled={loading || !tiendaId}>
                <FiRefreshCcw /> {loading ? 'Actualizando…' : 'Actualizar'}
              </button>
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
            <button className="btn btn-primary" onClick={crearProducto}>
              <FiPlus /> Crear producto
            </button>
          </section>
        )}

        {/* Grid por categorías / skeletons */}
        {loading ? (
          <section className="productos-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <article key={i} className="producto-card skeleton" />
            ))}
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
                  {grupo.productos.map((p) => (
                    <article
                      key={p.id}
                      className="producto-card"
                      data-estado={p.estado}
                      data-destacado={p.destacado ? '1' : '0'}
                    >
                      <figure className="producto-media">
                        <ImageCarousel images={p.imagenes} productName={p.nombre} />
                        {p.destacado && (
                          <span className="producto-chip chip-star" title="Producto destacado">
                            <FiStar />
                          </span>
                        )}
                        <span className="producto-chip chip-estado" data-estado={p.estado}>
                          {p.estado}
                        </span>
                      </figure>

                      <div className="producto-body">
                        <header className="producto-head">
                          <h4 className="producto-title" title={p.nombre}>{p.nombre}</h4>
                        </header>

                        <div className="producto-meta">
                          <span className="producto-slug">/{p.slug}</span>
                        </div>

                        <div className="producto-precio">
                          {typeof p.precio === 'number' ? (
                            <>
                              <span className="precio">{currency(p.precio)}</span>
                              {typeof p.precioComparativo === 'number' && (
                                <span className="precio-compare">{currency(p.precioComparativo)}</span>
                              )}
                              {p.descuentoPct ? <span className="precio-desc">-{p.descuentoPct}%</span> : null}
                            </>
                          ) : (
                            <span className="badge">Con variantes</span>
                          )}
                        </div>

                        <div className="producto-footer">
                          <span className="producto-stock" data-stock={calcStock(p)}>
                            {stockText(p)}
                          </span>
                          <div className="producto-actions">
                            <button className="icon" onClick={() => toggleEstado(p)} title={p.estado === 'ACTIVE' ? 'Pausar' : 'Activar'}>
                              {p.estado === 'ACTIVE' ? <FiPause /> : <FiPlay />}
                            </button>
                            <button className="icon" onClick={() => toggleDestacado(p)} title={p.destacado ? 'Quitar destacado' : 'Marcar destacado'}>
                              <FiStar />
                            </button>
                            <button className="icon" onClick={() => verPublico(p)} title="Ver público">
                              <FiEye />
                            </button>
                            <button className="icon" onClick={() => editarProducto(p)} title="Editar">
                              <FiEdit2 />
                            </button>
                            <button className="icon danger" onClick={() => eliminarProducto(p)} title="Eliminar">
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Modal Categorías */}
      {showCatModal && (
        <section className="panel-overlay" onClick={() => setShowCatModal(false)}>
          <div className="panel-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header className="panel-head">
              <h3>Categorías</h3>
              <button className="icon" onClick={() => setShowCatModal(false)} title="Cerrar"><FiX /></button>
            </header>

            <p className="panel-subtitle">Crea y organiza categorías para tu catálogo.</p>

            <div className="categorias-new">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nombre de la nueva categoría"
                onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
              />
              <button className="btn btn-primary" onClick={agregarCategoria}><FiPlus /> Agregar</button>
            </div>

            <ul className="categorias-lista">
              {categorias.map((c) => (
                <li key={c.id}>
                  {editCatId === c.id ? (
                    <>
                      <input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarEdicionCat()}
                      />
                      <div className="cat-actions">
                        <button className="btn btn-secondary" onClick={guardarEdicionCat}><FiCheck /> Guardar</button>
                        <button className="btn btn-ghost" onClick={() => { setEditCatId(null); setEditCatName(''); }}>
                          <FiX /> Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="cat-name">{c.nombre}</span>
                      <div className="cat-actions">
                        <button className="btn btn-ghost" onClick={() => { setEditCatId(c.id); setEditCatName(c.nombre); }}>
                          <FiEdit2 /> Renombrar
                        </button>
                        <button className="btn btn-danger" onClick={() => eliminarCategoria(c.id)}>
                          <FiTrash2 /> Eliminar
                        </button>
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
          <form
            className="panel-content crear-contenido"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitEditor}
          >
            {/* Cabecera */}
            <header className="panel-head">
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <h3 style={{margin:0}}>{mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}</h3>
                <div style={{fontSize:'.85rem',color:'var(--text-muted)'}}>URL: <span className="producto-slug">/{computedSlug || 'nuevo-producto'}</span></div>
              </div>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <label className="check">
                  <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
                  <span>Visible</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} />
                  <span>Destacado</span>
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  aria-label="Estado"
                  className="select"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
                <button type="button" className="icon" onClick={() => setShowEditor(false)} title="Cerrar">
                  <FiX />
                </button>
              </div>
            </header>

            {/* Cuerpo */}
            <div className="crear-grid" style={{alignItems:'start'}}>

              {/* Columna izquierda */}
              <div className="crear-col">
                <label className={`field ${errors.nombre ? 'has-error':''}`}>
                  <span>Nombre *</span>
                  <input
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    placeholder="Ej. Tenis deportivos Falcon"
                  />
                  {errors.nombre && <small className="error">{errors.nombre}</small>}
                </label>

                <label className="field">
                  <span>Descripción</span>
                  <textarea
                    rows={4}
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Cuenta por qué este producto es genial…"
                  />
                </label>

                {/* Selector de Tipo */}
                <div className="tipo-grid">
                  <span className="subhead">Tipo de producto</span>
                  <div className="tipo-cards">
                    {TIPOS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        className={`tipo-card ${form.tipo === t.value ? 'active':''}`}
                        onClick={() => setForm({ ...form, tipo: t.value })}
                        aria-pressed={form.tipo === t.value}
                      >
                        <div className="tipo-title">{t.label}</div>
                        <div className="tipo-desc">{t.desc}</div>
                        <div className="tipo-badges">
                          {t.badges.map(b => <span key={b} className="chip small">{b}</span>)}
                        </div>
                      </button>
                    ))}
                  </div>
                  {(form.tipo !== 'SIMPLE') && (
                    <p className="muted" style={{marginTop:'.25rem'}}>
                      <FiInfo /> Por ahora el inventario por variantes/servicios/digitales se configura después.
                      Guardaremos el producto sin inventario (no rompe tu API).
                    </p>
                  )}

                  {/* CTA Variantes cuando el tipo es VARIANTE */}
                  {form.tipo === 'VARIANTE' && (
                    <div style={{marginTop:'.5rem', display:'flex', gap:8, alignItems:'center'}}>
                      {mode === 'edit' && editId ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openVariantesModal(editId)}
                        >
                          <FiEdit2 /> Gestionar variantes…
                        </button>
                      ) : (
                        <span className="muted">Guarda el producto para agregar variantes.</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Precios */}
                <h4 className="subhead">Precios</h4>
                <div className="crear-row">
                  <label className={`field ${errors.precio ? 'has-error':''}`}>
                    <span>Precio actual{form.tipo==='SIMPLE' && ' *'}</span>
                    <input
                      type="number" step="0.01"
                      value={form.precio}
                      onChange={(e) => setForm({ ...form, precio: e.target.value })}
                      placeholder="ej. 129.99"
                    />
                    {errors.precio && <small className="error">{errors.precio}</small>}
                  </label>
                  <label className="field">
                    <span>Precio antes (comparativo)</span>
                    <input
                      type="number" step="0.01"
                      value={form.precioComparativo}
                      onChange={(e) => setForm({ ...form, precioComparativo: e.target.value })}
                      placeholder="ej. 169.99"
                    />
                  </label>
                </div>

                <div className="crear-row">
                  <label className="field">
                    <span>Costo</span>
                    <input type="number" step="0.01" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>% Descuento</span>
                    <input
                      type="number" min="0" max="100"
                      value={form.descuentoPct}
                      onChange={(e) => setForm({ ...form, descuentoPct: e.target.value })}
                      placeholder={descuentoSugerido != null ? `${descuentoSugerido} sugerido` : 'ej. 15'}
                    />
                  </label>
                </div>

                {/* KPI cards */}
                <div className="kpis">
                  <div className="kpi">
                    <div className="kpi-title"><FiInfo /> Descuento sugerido</div>
                    <div className="kpi-value">{descuentoSugerido != null ? `-${descuentoSugerido}%` : '—'}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title"><FiInfo /> Margen</div>
                    <div className="kpi-value">
                      {margen ? `${currency(margen.m)}${margen.pct != null ? ` · ${margen.pct.toFixed(0)}%` : ''}` : '—'}
                    </div>
                  </div>
                </div>

                {/* Inventario (solo SIMPLE) */}
                {form.tipo === 'SIMPLE' && (
                  <>
                    <h4 className="subhead">Inventario</h4>
                    <div className="crear-row">
                      <label className={`field ${errors.stock ? 'has-error':''}`}>
                        <span>Stock *</span>
                        <input type="number" min="0" value={form.inventarioStock} onChange={(e) => setForm({ ...form, inventarioStock: e.target.value })} />
                        {errors.stock && <small className="error">{errors.stock}</small>}
                      </label>
                      <label className="field">
                        <span>Umbral alerta</span>
                        <input type="number" min="0" value={form.inventarioUmbral} onChange={(e) => setForm({ ...form, inventarioUmbral: e.target.value })} />
                      </label>
                    </div>
                    <label className="check">
                      <input type="checkbox" checked={form.backorder} onChange={(e) => setForm({ ...form, backorder: e.target.checked })} />
                      <span>Permitir backorder</span>
                    </label>
                  </>
                )}

                {/* Categorías (chips) */}
                <h4 className="subhead" style={{marginTop:'1rem'}}>Categorías</h4>
                <div className="chips">
                  {categorias.length === 0 && <span className="muted">No tienes categorías.</span>}
                  {categorias.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`chip ${form.categoriasIds.includes(c.id) ? 'active':''}`}
                      onClick={() => toggleCategoria(c.id)}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columna derecha: imágenes + preview */}
              <div className="crear-col">
                <h4 className="subhead">Imágenes</h4>
                <div
                  className="crear-uploader"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <label className="btn-file">
                    <FiUpload /> Seleccionar imágenes
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
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
                          <img src={`${FILES}${img.url}`} alt={img.alt || `img-${idx}`} />
                          <div className="img-actions">
                            <div style={{display:'flex', gap:6}}>
                              <button type="button" className="icon" onClick={() => moveImagen(idx, -1)} title="Mover a la izquierda"><FiChevronLeft /></button>
                              <button type="button" className="icon" onClick={() => moveImagen(idx, +1)} title="Mover a la derecha"><FiChevronRight /></button>
                              {!img.isPrincipal ? (
                                <button type="button" className="icon" onClick={() => setPrincipal(idx)} title="Marcar principal"><FiStar /></button>
                              ) : (
                                <span className="chip chip-principal"><FiStar /> Principal</span>
                              )}
                            </div>
                            <button type="button" className="icon danger" onClick={() => removeImagen(idx)} title="Quitar">
                              <FiX />
                            </button>
                          </div>
                          <input
                            className="img-alt"
                            value={img.alt}
                            onChange={(e) => updateAlt(idx, e.target.value)}
                            placeholder="Texto alternativo (accesible/SEO)"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Aún no has subido imágenes.</p>
                  )}
                </div>

                {/* Preview en vivo */}
                <h4 className="subhead">Preview</h4>
                <article
                  className="producto-card preview"
                  data-estado={form.estado}
                  data-destacado={form.destacado ? '1' : '0'}
                >
                  <figure className="producto-media">
                    {form.imagenes?.length ? (
                      <ImageCarousel images={form.imagenes} productName={form.nombre || 'Producto'} />
                    ) : (
                      <div className="producto-media-empty"><span>Sin imágenes</span></div>
                    )}
                    {form.destacado && (
                      <span className="producto-chip chip-star" title="Producto destacado">
                        <FiStar />
                      </span>
                    )}
                    <span className="producto-chip chip-estado" data-estado={form.estado}>
                      {form.estado}
                    </span>
                  </figure>
                  <div className="producto-body">
                    <header className="producto-head">
                      <h4 className="producto-title" title={form.nombre || 'Nuevo producto'}>
                        {form.nombre || 'Nuevo producto'}
                      </h4>
                    </header>
                    <div className="producto-meta">
                      <span className="producto-slug">/{computedSlug || 'nuevo-producto'}</span>
                    </div>
                    <div className="producto-precio">
                      {precioNum != null ? (
                        <>
                          <span className="precio">{currency(precioNum)}</span>
                          {precioCompNum != null && (
                            <span className="precio-compare">{currency(precioCompNum)}</span>
                          )}
                          {form.descuentoPct ? <span className="precio-desc">-{form.descuentoPct}%</span> : descuentoSugerido != null ? <span className="precio-desc">-{descuentoSugerido}%</span> : null}
                        </>
                      ) : (
                        <span className="badge">{form.tipo === 'SIMPLE' ? 'Definir precio' : 'Con variantes'}</span>
                      )}
                    </div>
                    <div className="producto-footer">
                      <span className="producto-stock" data-stock={form.tipo === 'SIMPLE' ? (Number(form.inventarioStock || 0)) : 0}>
                        {form.tipo === 'SIMPLE'
                          ? (Number(form.inventarioStock || 0) > 0 ? `En stock: ${form.inventarioStock}` : 'Sin stock')
                          : '—'}
                      </span>
                      <div className="producto-actions">
                        <button className="icon" type="button" title="Vista"><FiEye /></button>
                        <button className="icon" type="button" title="Favorito"><FiStar /></button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <footer className="panel-foot crear-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowEditor(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !form.nombre.trim()}
                title={!form.nombre.trim() ? 'Completa el nombre' : undefined}
              >
                {saving ? 'Guardando…' : (<><FiCheck /> {mode === 'edit' ? 'Guardar cambios' : 'Guardar producto'}</>)}
              </button>
            </footer>
          </form>
        </section>
      )}

      {/* Sub-modal Variantes */}
      {showVariantes && (
        <section className="panel-overlay" onClick={() => setShowVariantes(false)}>
          <div className="panel-content variantes-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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
                            {v.opciones ? (
                              <small className="muted">{safeStringify(v.opciones)}</small>
                            ) : <small className="muted">—</small>}
                          </td>
                          <td style={{textAlign:'right'}}>{typeof v.precio === 'number' ? currency(v.precio) : '—'}</td>
                          <td style={{textAlign:'right'}}>{typeof v?.inventario?.stock === 'number' ? v.inventario.stock : 0}</td>
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
                  <label className="field">
                    <span>SKU</span>
                    <input value={vForm.sku} onChange={(e) => setVForm({ ...vForm, sku: e.target.value })} placeholder="Ej. FALCON-ROJO-M" />
                  </label>
                  <label className="field">
                    <span>Nombre</span>
                    <input value={vForm.nombre} onChange={(e) => setVForm({ ...vForm, nombre: e.target.value })} placeholder="Ej. Rojo / M" />
                  </label>
                </div>

                <label className="field">
                  <span>Opciones (JSON)</span>
                  <input
                    value={vForm.opcionesText}
                    onChange={(e) => setVForm({ ...vForm, opcionesText: e.target.value })}
                    placeholder='Ej. {"talla":"M","color":"Rojo"}'
                  />
                </label>

                <div className="crear-row">
                  <label className="field">
                    <span>Precio</span>
                    <input type="number" step="0.01" value={vForm.precio} onChange={(e) => setVForm({ ...vForm, precio: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Precio comparativo</span>
                    <input type="number" step="0.01" value={vForm.precioComparativo} onChange={(e) => setVForm({ ...vForm, precioComparativo: e.target.value })} />
                  </label>
                </div>

                <div className="crear-row">
                  <label className="field">
                    <span>Costo</span>
                    <input type="number" step="0.01" value={vForm.costo} onChange={(e) => setVForm({ ...vForm, costo: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Stock</span>
                    <input type="number" min="0" value={vForm.stock} onChange={(e) => setVForm({ ...vForm, stock: e.target.value })} />
                  </label>
                </div>

                <div className="crear-row">
                  <label className="field">
                    <span>Umbral alerta</span>
                    <input type="number" min="0" value={vForm.umbral} onChange={(e) => setVForm({ ...vForm, umbral: e.target.value })} />
                  </label>
                  <label className="check" style={{marginTop:28}}>
                    <input type="checkbox" checked={vForm.backorder} onChange={(e) => setVForm({ ...vForm, backorder: e.target.checked })} />
                    <span>Permitir backorder</span>
                  </label>
                </div>

                <h4 className="subhead">Imágenes de variante</h4>
                <div className="crear-uploader" onDragOver={(e)=>{e.preventDefault();}} onDrop={(e)=>{e.preventDefault(); onUploadVImages(e.dataTransfer?.files);}}>
                  <label className="btn-file">
                    <FiUpload /> Subir imágenes
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      multiple
                      onChange={(e) => onUploadVImages(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {vForm.imagenes.length > 0 ? (
                    <ul className="imgs-list">
                      {vForm.imagenes.map((img, idx) => (
                        <li key={idx}>
                          <img src={`${FILES}${img.url}`} alt={img.alt || `var-${idx}`} />
                          <div className="img-actions">
                            <div style={{display:'flex', gap:6}}>
                              <button type="button" className="icon" onClick={() => moveVImagen(idx, -1)} title="Mover a la izquierda"><FiChevronLeft /></button>
                              <button type="button" className="icon" onClick={() => moveVImagen(idx, +1)} title="Mover a la derecha"><FiChevronRight /></button>
                            </div>
                            <button type="button" className="icon danger" onClick={() => removeVImagen(idx)} title="Quitar">
                              <FiX />
                            </button>
                          </div>
                          <input
                            className="img-alt"
                            value={img.alt}
                            onChange={(e) => updateVAlt(idx, e.target.value)}
                            placeholder="Texto alternativo"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Aún no has subido imágenes para esta variante.</p>
                  )}
                </div>

                <div style={{display:'flex',gap:8,justifyContent:'flex-end', marginTop:12}}>
                  {vMode === 'edit' && (
                    <button type="button" className="btn btn-ghost" onClick={vStartCreate}><FiX /> Cancelar edición</button>
                  )}
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
