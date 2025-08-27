// src/lib/uploadSupabase.js
const { getSupabase } = require('./supabase');
const mime = require('mime-types');
const crypto = require('crypto');

function uid(n = 12) {
  return crypto.randomBytes(n).toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, n);
}

function slugifyName(s = '') {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 40) || 'file';
}

function cleanFolderPath(folder = 'misc') {
  return String(folder)
    .replace(/^\/+|\/+$/g, '')      // sin slashes al inicio/fin
    .replace(/\.\./g, '')           // nada de subir directorios
    .replace(/\/{2,}/g, '/')
    || 'misc';
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
 * @param {Buffer} opts.buffer             - contenido del archivo
 * @param {string} opts.mimetype           - mimetype (image/png, ...)
 * @param {string} [opts.folder='misc']    - carpeta lógica dentro del bucket
 * @param {string} [opts.filename='']      - base del nombre (sin extensión)
 * @param {'public'|'signed'} [opts.visibility] - si no especificas: usa SUPABASE_BUCKET_PUBLIC
 * @param {boolean} [opts.upsert=false]
 * @param {string|number} [opts.cacheSeconds='31536000'] - Cache-Control en segundos
 *
 * @returns {Promise<{ key:string, url:string, isSigned:boolean }>}
 */
async function uploadToSupabase({
  buffer,
  mimetype,
  folder = 'misc',
  filename = '',
  visibility,
  upsert = false,
  cacheSeconds = '31536000', // 1 año
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

  const key = `${cleanFolder}/${Date.now()}-${uid()}-${baseName}.${ext}`;

  // Subida
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(key, buffer, {
      contentType: mimetype,
      upsert,
      cacheControl: String(cacheSeconds), // Supabase espera segundos ("31536000")
    });

  if (upErr) {
    // Mensaje más claro
    throw new Error(`[Supabase upload] ${upErr.message || upErr}`);
  }

  // ¿Bucket público o firmamos URL?
  const bucketIsPublic = (process.env.SUPABASE_BUCKET_PUBLIC === '1' || process.env.SUPABASE_BUCKET_PUBLIC === 'true');

  let url = '';
  let isSigned = false;

  if (visibility === 'signed' || (!bucketIsPublic && visibility !== 'public')) {
    // Firmada (por defecto 7 días si no especificas; puedes ajustar SUPABASE_SIGNED_TTL)
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
