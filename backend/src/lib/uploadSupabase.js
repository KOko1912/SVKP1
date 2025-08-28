// backend/src/lib/uploadSupabase.js
const { getSupabase } = require('./supabase');
const mime = require('mime-types');
const crypto = require('crypto');

/** UID seguro, sin caracteres raros */
function uid(n = 12) {
  try {
    // Node 16+ soporta 'base64url'
    return crypto.randomBytes(n).toString('base64url').slice(0, n);
  } catch {
    // Fallback por si no existe 'base64url'
    return crypto
      .randomBytes(n)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, n);
  }
}

/** Nombre base limpio para archivos */
function slugifyName(s = '') {
  return (
    String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 40) || 'file'
  );
}

/** Carpeta limpia (sin //, sin .., sin barras al inicio/fin) */
function cleanFolderPath(folder = 'misc') {
  return (
    String(folder)
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.\./g, '')
      .replace(/\/{2,}/g, '/') || 'misc'
  );
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[Supabase] Falta variable de entorno: ${name}`);
  return v;
}

/**
 * Sube un buffer a Supabase Storage.
 *
 * @param {Object} opts
 * @param {Buffer} opts.buffer
 * @param {string} opts.mimetype
 * @param {string} [opts.folder='misc']
 * @param {string} [opts.filename='']
 * @param {'public'|'signed'} [opts.visibility]        - si no se especifica, usa SUPABASE_BUCKET_PUBLIC
 * @param {boolean} [opts.upsert=false]
 * @param {string|number} [opts.cacheSeconds='31536000']
 * @returns {Promise<{ key:string, url:string, isSigned:boolean }>}
 */
async function uploadToSupabase({
  buffer,
  mimetype,
  folder = 'misc',
  filename = '',
  visibility,
  upsert = false,
  cacheSeconds = '31536000',
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('[uploadToSupabase] buffer inválido');
  }
  if (!mimetype || typeof mimetype !== 'string') {
    throw new Error('[uploadToSupabase] mimetype requerido');
  }

  const supabase = await getSupabase();
  const bucket = requireEnv('SUPABASE_BUCKET');

  const cleanFolder = cleanFolderPath(folder);
  const baseName = slugifyName(filename);
  const ext = mime.extension(mimetype) || 'bin';

  // key final: carpeta/epoch-uid-nombre.ext
  const key = `${cleanFolder}/${Date.now()}-${uid()}-${baseName}.${ext}`;

  // Subida
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(key, buffer, {
      contentType: mimetype,
      upsert,
      cacheControl: String(cacheSeconds), // en segundos
    });

  if (upErr) {
    // Errores comunes: bucket inexistente, permisos, tamaño, etc.
    throw new Error(`[Supabase upload] ${upErr.message || upErr}`);
  }

  // URL pública o firmada según config
  const bucketIsPublic =
    process.env.SUPABASE_BUCKET_PUBLIC === '1' ||
    process.env.SUPABASE_BUCKET_PUBLIC === 'true';

  let url = '';
  let isSigned = false;

  if (visibility === 'signed' || (!bucketIsPublic && visibility !== 'public')) {
    const ttl = Number(process.env.SUPABASE_SIGNED_TTL || 60 * 60 * 24 * 7); // 7 días
    const { data, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, ttl);
    if (signErr) throw new Error(`[Supabase signedUrl] ${signErr.message || signErr}`);
    url = data?.signedUrl || '';
    isSigned = true;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    url = data?.publicUrl || '';
    isSigned = false;
  }

  if (!url) throw new Error('[Supabase] No se pudo resolver URL del archivo');

  return { key, url, isSigned };
}

module.exports = { uploadToSupabase };
