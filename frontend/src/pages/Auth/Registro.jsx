import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './Auth.css';

function Registro() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    if (!nombre || !telefono || !contraseña) {
      setMensaje('Todos los campos son obligatorios.');
      return;
    }

    try {
      setCargando(true);
      const resp = await fetch(`${API}/api/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, contraseña })
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || data?.message || `Error ${resp.status}`);

      setMensaje('¡Registro exitoso! Redirigiendo…');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setMensaje(err.message || 'Error al registrar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-container">
      <button 
        onClick={() => navigate(-1)} 
        className="back-button"
      >
        <FiArrowLeft /> Volver
      </button>
      
      <h2>Registro de Usuario</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contraseña}
          onChange={(e) => setContraseña(e.target.value)}
        />
        <button type="submit" className="primary-button" disabled={cargando}>
          {cargando ? 'Creando…' : 'Registrar'}
        </button>
      </form>
      {mensaje && <p style={{ marginTop: '1rem' }}>{mensaje}</p>}
    </div>
  );
}

export default Registro;