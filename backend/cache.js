// backend/middleware/cache.js
const supabase = require('../supabase');

async function getCache(key) {
  const { data } = await supabase
    .from('cache')
    .select('value, expires_at')
    .eq('key', key)
    .single();
  if (data && new Date(data.expires_at) > new Date()) {
    return data.value;
  }
  return null;
}

async function setCache(key, value, ttlSeconds = 3600) {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase
    .from('cache')
    .upsert({ key, value, expires_at: expiresAt });
}

module.exports = { getCache, setCache };