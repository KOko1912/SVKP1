// frontend/src/lib/brandTheme.js
// ============================================================
// Utilidades para aplicar el "branding" del vendedor a la UI
// - Lee colores guardados en Perfil
// - Calcula contraste correcto para texto
// - Expone helpers para aplicar/guardar/cargar el tema
// ============================================================

/* ===================== helpers base ===================== */
export const grad = (from, to) => `linear-gradient(135deg, ${from}, ${to})`;

const hexToRgb = (hex) => {
  const m = String(hex || "").match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};
const luminance = ([r, g, b]) => {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
export const bestTextOn = (hexA, hexB) => {
  const L = (luminance(hexToRgb(hexA)) + luminance(hexToRgb(hexB))) / 2;
  return L > 0.45 ? "#111111" : "#ffffff";
};
export const extractColors = (gradientString) => {
  const m = String(gradientString || "").match(/#([0-9a-f]{6})/gi);
  return { from: m?.[0] || "#6d28d9", to: m?.[1] || "#c026d3" };
};

const overlayFor = (mode) => (mode === "light" ? 0.55 : 0.35);
const getMode = () => {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return "dark";
};

/* ===================== normalización ===================== */
/**
 * Acepta varios formatos:
 * - string con gradiente: "linear-gradient(... #rrggbb, #rrggbb)"
 * - objeto { from, to }  (hex)
 * - objeto tienda con: colorPrincipal (gradiente) o brandFrom/brandTo o tema.colores
 */
export function normalizeBrand(input) {
  if (!input) {
    const from = "#6d28d9";
    const to = "#c026d3";
    return { from, to, contrast: bestTextOn(from, to), gradient: grad(from, to) };
  }

  // Si ya viene {from, to}
  if (typeof input === "object" && input.from && input.to) {
    const from = input.from;
    const to = input.to;
    return { from, to, contrast: bestTextOn(from, to), gradient: grad(from, to) };
  }

  // Si es string (gradiente)
  if (typeof input === "string") {
    const { from, to } = extractColors(input);
    return { from, to, contrast: bestTextOn(from, to), gradient: grad(from, to) };
  }

  // Intentar mapear varias posibles formas del objeto tienda
  const tienda = input;
  let from = tienda.brandFrom || tienda?.tema?.from || tienda?.colores?.from;
  let to =
    tienda.brandTo || tienda?.tema?.to || tienda?.colores?.to;

  if (!from || !to) {
    const g =
      tienda.colorPrincipal ||
      tienda.brandGradient ||
      tienda?.tema?.gradient ||
      tienda?.colores?.gradient;
    const c = extractColors(g);
    from = from || c.from;
    to = to || c.to;
  }

  if (!from || !to) {
    from = "#6d28d9";
    to = "#c026d3";
  }

  return { from, to, contrast: bestTextOn(from, to), gradient: grad(from, to) };
}

/* ===================== aplicación a CSS ===================== */
export function applyBrandTheme(source, opts = {}) {
  if (typeof document === "undefined") return normalizeBrand(source);
  const { persist = true, colorMode } = opts;

  const { from, to, contrast, gradient } = normalizeBrand(source);
  const mode = colorMode || getMode();

  const root = document.documentElement.style;

  // Variables de marca
  root.setProperty("--brand-from", from);
  root.setProperty("--brand-to", to);
  root.setProperty("--brand-contrast", contrast);
  root.setProperty("--brand-gradient", gradient);

  // Tokens derivados usados en la UI
  root.setProperty("--primary-color", from);
  root.setProperty("--primary-hover", from);
  root.setProperty("--header-overlay", String(overlayFor(mode)));

  // Fondo de página con halos suaves (mismo patrón que Perfil)
  const softHalos = `radial-gradient(900px 600px at 0% -10%, ${from}22, transparent 60%),
                     radial-gradient(900px 600px at 100% -10%, ${to}22, transparent 60%)`;
  const pageBg = `${softHalos}, linear-gradient(135deg, ${from}, ${to})`;
  root.setProperty("--page-bg", pageBg);

  if (persist) {
    try {
      localStorage.setItem(
        "vk-brand",
        JSON.stringify({ from, to, contrast, gradient })
      );
    } catch {}
  }

  return { from, to, contrast, gradient };
}

/* Reaplica únicamente el overlay cuando cambia el modo (claro/oscuro) */
export function refreshOverlayForMode(mode) {
  if (typeof document === "undefined") return;
  const m = mode || getMode();
  document.documentElement.style.setProperty(
    "--header-overlay",
    String(overlayFor(m))
  );
}

/* ===================== carga/guardado ===================== */
export function loadSavedBrand() {
  try {
    const raw = localStorage.getItem("vk-brand");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return normalizeBrand(obj);
  } catch {
    return null;
  }
}

export function clearBrandTheme() {
  if (typeof document !== "undefined") {
    const root = document.documentElement.style;
    ["--brand-from","--brand-to","--brand-contrast","--brand-gradient",
     "--primary-color","--primary-hover","--page-bg","--header-overlay"
    ].forEach((v) => root.removeProperty(v));
  }
  try { localStorage.removeItem("vk-brand"); } catch {}
}

/* ===================== integración con backend ===================== */
/**
 * Descarga /api/tienda/me y aplica el tema del vendedor.
 * Devuelve {from,to,contrast,gradient} ya aplicados.
 */
export async function attachAutoBrandFromProfile({ apiBase, headers } = {}) {
  const base = String(apiBase || "").replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/tienda/me`, { headers: headers || {} });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("No se pudo leer la tienda.");
    return applyBrandTheme(data, { persist: true });
  } catch (e) {
    // Si falla, intenta cargar último guardado; si no, aplica default
    const saved = loadSavedBrand();
    if (saved) return applyBrandTheme(saved, { persist: false });
    return applyBrandTheme(null, { persist: false });
  }
}

/* ===================== atajos prácticos ===================== */
/**
 * Aplica el tema guardado (si existe) o, si no hay, no hace nada.
 * Útil en montajes tempranos.
 */
export function bootBrandFromStorage() {
  const saved = loadSavedBrand();
  if (saved) applyBrandTheme(saved, { persist: false });
  return saved;
}
