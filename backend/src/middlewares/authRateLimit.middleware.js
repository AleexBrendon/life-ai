const { createHash } = require('crypto');
// Atomic counter and expiry shared by every API replica.
const script = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return {n, redis.call('TTL', KEYS[1])}";
function createAuthRateLimit({ client = require('../database/redis'), limit = 30, seconds = 900 } = {}) {
 return async function authRateLimit(req, res, next) {
  const address = createHash('sha256').update(req.ip || req.socket?.remoteAddress || 'unknown').digest('hex');
  try {
   const [count, ttl] = await client.eval(script, 1, 'auth:attempts:' + address, seconds);
   if (Number(count) > limit) {
    res.setHeader('Retry-After', String(Math.max(1, Number(ttl))));
    return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
   }
   return next();
  } catch (error) {
   console.error('Limite de autenticação indisponível:', error.code || error.name);
   return res.status(503).json({ success: false, message: 'Autenticação temporariamente indisponível. Tente novamente.' });
  }
 };
}
module.exports = { createAuthRateLimit };
