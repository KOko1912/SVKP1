import NavBarUsuario from './NavBarUsuario';
export default function TiendasSeguidas() {
  return (
    <>
      <NavBarUsuario />
      <div style={{ padding: 16 }}>
        <h2>Tiendas seguidas</h2>
        <p>(En blanco) Revisar productos solo de servicios que sigues.</p>
      </div>
    </>
  );
}