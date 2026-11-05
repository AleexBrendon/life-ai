function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  const known = {
    'entity.parse.failed': [400, 'JSON inválido.'],
    'entity.too.large': [413, 'O conteúdo enviado excede o limite permitido.'],
    P2002: [409, 'Já existe um registro com esses dados.'],
    P2025: [404, 'Registro não encontrado.'],
  };
  const [status, message] = Object.hasOwn(known, error.type) ? known[error.type] : Object.hasOwn(known, error.code) ? known[error.code] : [500, 'Erro interno ao processar a solicitação.'];
  if (status === 500) console.error('Falha na requisição:', { method: req.method, path: req.path, code: error.code || error.name });
  return res.status(status).json({ success: false, message });
}
module.exports = errorMiddleware;
