function validateEnvironment(env = process.env) {
  for (const key of ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']) {
    if (!env[key]?.trim()) throw new Error('Configuração obrigatória ausente: ' + key);
  }
  for (const [key, protocols] of [['DATABASE_URL', ['postgres:', 'postgresql:']], ['REDIS_URL', ['redis:', 'rediss:']]]) {
    let url;
    try { url = new URL(env[key]); } catch { throw new Error('Configuração inválida: ' + key); }
    if (!protocols.includes(url.protocol)) throw new Error('Protocolo inválido: ' + key);
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  return { port };
}
module.exports = { validateEnvironment };
