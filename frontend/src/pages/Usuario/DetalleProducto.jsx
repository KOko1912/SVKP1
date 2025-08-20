import NavBarUsuario from './NavBarUsuario';
import { useParams } from 'react-router-dom';

export default function DetalleProducto() {
  const { id } = useParams();
  return (
    <>
      <NavBarUsuario />
      <div style={{ padding: 16 }}>
        <h2>Detalle del producto</h2>
        <p>(En blanco) ID: {id}</p>
      </div>
    </>
  );
}