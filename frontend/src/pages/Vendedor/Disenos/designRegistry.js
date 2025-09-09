// Registro de plantillas + carga dinámica (code-splitting)
export const DESIGN_OPTIONS = [
  { id: 'default',    name: 'Clásico / Neón',  loader: () => import('') },
  { id: 'cyberpunk',  name: 'Estilo Cyberpunk', loader: () => import('./DiseñoEstiloCyberpunk.js') },
];

// Utilidad para cargar una plantilla con fallback a 'default'
export async function loadDesignComponent(id = 'default') {
  const item = DESIGN_OPTIONS.find(x => x.id === id) || DESIGN_OPTIONS[0];
  try {
    const mod = await item.loader();
    return mod.default || mod;
  } catch {
    const fallback = await DESIGN_OPTIONS[0].loader();
    return fallback.default || fallback;
  }
}
