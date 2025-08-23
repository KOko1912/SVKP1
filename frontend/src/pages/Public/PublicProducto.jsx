import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiShoppingCart, FiHeart, FiShare2, FiChevronLeft, FiChevronRight,
  FiStar, FiTruck, FiShield, FiArrowLeft, FiCheck
} from 'react-icons/fi';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PublicProducto() {
  const { uuid } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [tiendaConfig, setTiendaConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Cargar configuración de la tienda
  useEffect(() => {
    const config = localStorage.getItem('tiendaConfig');
    if (config) {
      setTiendaConfig(JSON.parse(config));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/api/v1/public/uuid/${uuid}`);
        if (!r.ok) throw new Error('Not found');
        const data = await r.json();
        if (alive) setP(data);
        
        // Si el producto pertenece a una tienda, cargar su configuración
        if (data.tiendaId) {
          const tiendaRes = await fetch(`${API}/api/tienda/config/${data.tiendaId}`);
          if (tiendaRes.ok) {
            const tiendaData = await tiendaRes.json();
            setTiendaConfig(tiendaData);
            localStorage.setItem('tiendaConfig', JSON.stringify(tiendaData));
          }
        }
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
    if (!inv) return true;
    const stock = Number(inv.stock ?? 0);
    return stock > 0 || !!inv.permitirBackorder;
  }, [p]);

  const nextImage = () => {
    if (p?.imagenes?.length) {
      setCurrentImageIndex((prev) => (prev + 1) % p.imagenes.length);
    }
  };

  const prevImage = () => {
    if (p?.imagenes?.length) {
      setCurrentImageIndex((prev) => (prev - 1 + p.imagenes.length) % p.imagenes.length);
    }
  };

  const handleAddToCart = () => {
    setAddedToCart(true);
    // Aquí iría la lógica para agregar al carrito
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) return (
    <div className="product-loading" style={{
      background: tiendaConfig?.colorPrincipal || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="spinner" style={{
        width: '50px',
        height: '50px',
        border: '5px solid rgba(255,255,255,0.3)',
        borderRadius: '50%',
        borderTopColor: '#fff',
        animation: 'spin 1s ease-in-out infinite'
      }}></div>
    </div>
  );
  
  if (!p) return (
    <div className="page" style={{
      padding: '2rem',
      textAlign: 'center',
      background: tiendaConfig?.colorPrincipal || '#f8f9fa',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h3>Producto no encontrado</h3>
      <button 
        onClick={() => nav(-1)}
        style={{
          padding: '0.75rem 1.5rem',
          background: tiendaConfig ? `linear-gradient(135deg, ${tiendaConfig.theme?.from || '#667eea'}, ${tiendaConfig.theme?.to || '#764ba2'})` : '#667eea',
          color: tiendaConfig?.theme?.contrast || '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '1rem',
          fontWeight: '600'
        }}
      >
        Volver
      </button>
    </div>
  );

  // Estilos dinámicos basados en la configuración de la tienda
  const brandGradient = tiendaConfig?.colorPrincipal || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  const textColor = tiendaConfig?.theme?.contrast || '#2d3748';
  const primaryColor = tiendaConfig?.theme?.from || '#667eea';
  const secondaryColor = tiendaConfig?.theme?.to || '#764ba2';

  return (
    <div className="product-page" style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      color: textColor,
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      {/* Header con navegación */}
      <header style={{
        background: brandGradient,
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: tiendaConfig?.theme?.contrast || '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <button 
          onClick={() => nav(-1)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'inherit',
            cursor: 'pointer'
          }}
        >
          <FiArrowLeft />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {tiendaConfig?.logoUrl && (
            <img 
              src={`${API}${tiendaConfig.logoUrl}`} 
              alt="Logo de la tienda" 
              style={{ height: '40px', borderRadius: '8px' }}
            />
          )}
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
            {tiendaConfig?.nombre || 'Tienda'}
          </h1>
        </div>
        
        <div style={{ width: '40px' }}></div> {/* Espaciador para equilibrar */}
      </header>

      {/* Contenido principal del producto */}
      <main style={{
        maxWidth: '1200px',
        margin: '2rem auto',
        padding: '0 1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '3rem',
        alignItems: 'start'
      }}>
        {/* Galería de imágenes */}
        <div className="product-gallery" style={{ position: 'relative' }}>
          {p.imagenes?.length ? (
            <>
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                aspectRatio: '1/1'
              }}>
                <img 
                  src={p.imagenes[currentImageIndex].url} 
                  alt={p.imagenes[currentImageIndex].alt || p.nombre}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                
                {p.imagenes.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.8)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={nextImage}
                      style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.8)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    >
                      <FiChevronRight size={20} />
                    </button>
                  </>
                )}
                
                {p.descuentoPct > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: '#ff4444',
                    color: 'white',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    -{p.descuentoPct}%
                  </div>
                )}
              </div>
              
              {p.imagenes.length > 1 && (
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  overflowX: 'auto',
                  paddingBottom: '0.5rem'
                }}>
                  {p.imagenes.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      style={{
                        width: '60px',
                        height: '60px',
                        border: index === currentImageIndex ? `2px solid ${primaryColor}` : '1px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        padding: 0,
                        background: 'transparent',
                        flexShrink: 0
                      }}
                    >
                      <img 
                        src={img.url} 
                        alt="" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{
              aspectRatio: '1/1',
              background: '#e9ecef',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6c757d'
            }}>
              Sin imagen
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="product-info" style={{ padding: '1rem 0' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            {p.categorias?.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                flexWrap: 'wrap'
              }}>
                {p.categorias.map(pc => (
                  <span key={pc.categoria.id} style={{
                    background: 'rgba(0,0,0,0.05)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    {pc.categoria.nombre}
                  </span>
                ))}
              </div>
            )}
            
            <h1 style={{
              margin: '0 0 1rem 0',
              fontSize: '2.25rem',
              fontWeight: '800',
              lineHeight: '1.2'
            }}>
              {p.nombre}
            </h1>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', color: '#ffc107' }}>
                {[...Array(5)].map((_, i) => (
                  <FiStar key={i} fill={i < 4 ? "#ffc107" : "none"} />
                ))}
              </div>
              <span style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                (42 reseñas)
              </span>
            </div>
          </div>

          {/* Precio */}
          {p.tipo === 'SIMPLE' && typeof p.precio === 'number' && (
            <div style={{ marginBottom: '1.5rem' }}>
              {p.descuentoPct ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    color: primaryColor
                  }}>
                    ${precioFinal.toFixed(2)}
                  </span>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '500',
                    color: '#6c757d',
                    textDecoration: 'line-through'
                  }}>
                    ${Number(p.precio).toFixed(2)}
                  </span>
                  <span style={{
                    background: '#ff4444',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    Ahorras {p.descuentoPct}%
                  </span>
                </div>
              ) : (
                <span style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: primaryColor
                }}>
                  ${Number(p.precio).toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Descripción */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.25rem' }}>Descripción</h3>
            <p style={{
              margin: 0,
              lineHeight: '1.6',
              color: '#495057'
            }}>
              {p.descripcion || 'Este producto no tiene descripción disponible.'}
            </p>
          </div>

          {/* Alertas de stock */}
          {alertaPocasUnidades && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              color: '#856404',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              ¡Quedan pocas unidades! No te quedes sin tu producto.
            </div>
          )}

          {/* Selector de cantidad y botones de acción */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <label htmlFor="quantity" style={{ fontWeight: '600' }}>Cantidad:</label>
              <div style={{
                display: 'flex',
                border: '1px solid #ced4da',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: 'none',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  -
                </button>
                <input 
                  type="number" 
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  style={{
                    width: '60px',
                    height: '40px',
                    border: 'none',
                    borderLeft: '1px solid #ced4da',
                    borderRight: '1px solid #ced4da',
                    textAlign: 'center',
                    appearance: 'textfield',
                    MozAppearance: 'textfield'
                  }}
                />
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: 'none',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleAddToCart}
                disabled={!puedeComprar || addedToCart}
                style={{
                  flex: '1',
                  minWidth: '200px',
                  padding: '1rem 2rem',
                  background: puedeComprar 
                    ? brandGradient 
                    : '#6c757d',
                  color: tiendaConfig?.theme?.contrast || '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: puedeComprar ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease',
                  opacity: addedToCart ? 0.8 : 1
                }}
                onMouseOver={(e) => {
                  if (puedeComprar) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                  }
                }}
                onMouseOut={(e) => {
                  if (puedeComprar) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }
                }}
              >
                {addedToCart ? (
                  <>
                    <FiCheck size={20} /> ¡Agregado!
                  </>
                ) : puedeComprar ? (
                  <>
                    <FiShoppingCart size={20} /> Agregar al carrito
                  </>
                ) : (
                  'Sin stock'
                )}
              </button>

              <button style={{
                padding: '1rem',
                border: `1px solid ${primaryColor}`,
                background: 'transparent',
                color: primaryColor,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiHeart size={20} />
              </button>

              <button style={{
                padding: '1rem',
                border: `1px solid ${primaryColor}`,
                background: 'transparent',
                color: primaryColor,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiShare2 size={20} />
              </button>
            </div>
          </div>

          {/* Garantías y envíos */}
          <div style={{
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Beneficios</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiTruck size={20} color={primaryColor} />
                <div>
                  <div style={{ fontWeight: '600' }}>Envío gratis</div>
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>En compras +$500</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiShield size={20} color={primaryColor} />
                <div>
                  <div style={{ fontWeight: '600' }}>Garantía</div>
                  <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>30 días</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Banner de SystemVkode */}
      <footer style={{
        background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
        color: 'white',
        padding: '2rem',
        marginTop: '3rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
            ¿Necesitas una tienda online como esta?
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
            Desarrollamos tiendas personalizadas con diseño premium y todas las funcionalidades que necesitas
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <a 
              href="https://wa.me/528441786280" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                background: '#25D366',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.488"/>
              </svg>
              Contactar por WhatsApp
            </a>
            <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>
              📞 8441786280
            </div>
          </div>
          <p style={{ margin: '1.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.7 }}>
            SystemVkode - Desarrollos personalizados a medida
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          
          .product-info {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}