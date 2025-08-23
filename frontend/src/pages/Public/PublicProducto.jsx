import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PublicProducto() {
  const { uuid } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/v1/public/uuid/${uuid}`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        if (alive) setP(data);
      } catch {
        if (alive) setP(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uuid]);

  const precioFinal = useMemo(() => {
    if (!p?.precio) return null;
    const desc = Number(p.descuentoPct || 0);
    return desc > 0 ? (Number(p.precio) * (100 - desc)) / 100 : Number(p.precio);
  }, [p]);

  const alertaPocasUnidades = useMemo(() => {
    const inv = p?.inventario;
    if (!inv) return false;
    const stock = Number(inv.stock ?? 0);
    const umbral = Number(inv.umbralAlerta ?? 0);
    return stock <= umbral;
  }, [p]);

  const puedeComprar = useMemo(() => {
    const inv = p?.inventario;
    if (!inv) return true; // productos digitales/servicio
    const stock = Number(inv.stock ?? 0);
    return stock > 0 || !!inv.permitirBackorder;
  }, [p]);

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!p) return <div className="page"><h3>Producto no encontrado</h3><button onClick={() => nav(-1)}>Volver</button></div>;

  return (
    <div className="product-panel">
      <button className="panel-close" onClick={() => nav(-1)}>×</button>

      <div className="product-panel__media">
        {p.imagenes?.length
          ? p.imagenes.map((m, i) => <img key={i} src={m.url} alt={m.alt || p.nombre} />)
          : <div className="no-image">Sin imagen</div>}
      </div>

      <div className="product-panel__body">
        <h1>{p.nombre}</h1>

        {p.categorias?.length ? (
          <div className="chips">
            {p.categorias.map(pc => <span className="chip" key={pc.categoria.id}>{pc.categoria.nombre}</span>)}
          </div>
        ) : null}

        {p.tipo === 'SIMPLE' && typeof p.precio === 'number' && (
          <div className="price">
            {p.descuentoPct
              ? (<>
                  <span className="price-now">${precioFinal.toFixed(2)}</span>
                  <span className="price-old">${Number(p.precio).toFixed(2)}</span>
                  <span className="price-off">-{p.descuentoPct}%</span>
                </>)
              : <span className="price-now">${Number(p.precio).toFixed(2)}</span>}
          </div>
        )}

        {alertaPocasUnidades && <div className="alert warn">¡Pocas unidades disponibles!</div>}

        <p className="desc">{p.descripcion || 'Sin descripción'}</p>

        <div className="actions">
          <button className="btn" disabled={!puedeComprar}>
            {puedeComprar ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
