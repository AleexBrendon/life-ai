const generationPaths = new Set(['/chat', '/setup/preview', '/week/preview', '/routine/preview', '/shopping/analyze', '/recommendations']);
const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('TTL', KEYS[1])}";

function positiveInteger(value, fallback, name) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Configuração inválida: ' + name);
  return number;
}

function createAiRateLimit({ client, limit = process.env.AI_RATE_LIMIT_REQUESTS, seconds = process.env.AI_RATE_LIMIT_WINDOW_SECONDS, log = console.error } = {}) {
  limit = positiveInteger(limit, 10, 'AI_RATE_LIMIT_REQUESTS');
  seconds = positiveInteger(seconds, 60, 'AI_RATE_LIMIT_WINDOW_SECONDS');
  client = client || require('../database/redis');
  return async function aiRateLimit(req, res, next) {
    // Express routes are case-insensitive and accept a trailing slash by default.
    if (req.method !== 'POST' || !generationPaths.has(req.path.toLowerCase().replace(/\/+$/, ''))) return next();
    if (!Number.isSafeInteger(req.user?.id) || req.user.id < 1) {
      return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
    }
    try {
      const [count, ttl] = await client.eval(script, 1, 'ai:requests:user:' + req.user.id, seconds);
      if (Number(count) > limit) {
        res.setHeader('Retry-After', String(Math.max(1, Number(ttl))));
        return res.status(429).json({ success: false, message: 'Limite de análises atingido. Aguarde antes de tentar novamente.' });
      }
      return next();
    } catch (error) {
      log('Limite de IA indisponível:', error.code || error.name);
      return res.status(503).json({ success: false, message: 'As análises estão temporariamente indisponíveis. Tente novamente.' });
    }
  };
}

module.exports = { createAiRateLimit };
