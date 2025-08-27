// src/lib/uploadSupabase.js
const { getSupabase } = require('./supabase');
const mime = require('mime-types');
const crypto = require('crypto');

function uid(n = 12) {
  return crypto.randomBytes(n).toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, n);
}

async function uploadToSupabase({ buffer, mimetype, folder = 'misc', filename = '' }) {
  const supabase = await getSupabase();

  const cleanFolder = (folder || 'misc').replace(/^\/*|\/*$/g, '');
  const ext = mime.extension(mimetype) || 'bin';
  const namePart = filename ? `-${filename}` : '';
  const key = `${cleanFolder}/${Date.now()}-${uid()}${namePart}.${ext}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(key, buffer, { contentType: mimetype, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(key);

  return { key, url: data.publicUrl };
}

module.exports = { uploadToSupabase };
