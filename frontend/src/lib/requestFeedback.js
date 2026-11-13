const generationPaths = new Set(['/ai/chat', '/ai/setup/preview', '/ai/week/preview', '/ai/routine/preview', '/ai/shopping/analyze', '/ai/recommendations']);

export function requestTimeout(url = '', method = 'get') {
  return method.toLowerCase() === 'post' && generationPaths.has(url.split('?')[0].replace(/\/+$/, '')) ? 120000 : 20000;
}

export function requestErrorMessage(error, fallback = 'Não foi possível salvar. Tente novamente.') {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'A resposta demorou mais do que o esperado. Confira se a alteração foi salva antes de tentar novamente.';
  }
  if (!error.response) return 'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.';
  const message = typeof error.response.data?.message === 'string' ? error.response.data.message : fallback;
  const retry = Number(error.response.headers?.['retry-after']);
  return error.response.status === 429 && Number.isFinite(retry) && retry > 0 ? `${message} Tente novamente em ${Math.ceil(retry)} segundos.` : message;
}

export function requestFieldErrors(error) {
  const errors = error.response?.data?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.flatMap(issue => {
    if (typeof issue === 'string') {
      const separator = issue.indexOf(':');
      return [{ field: separator < 0 ? '' : issue.slice(0, separator).trim(), message: separator < 0 ? issue : issue.slice(separator + 1).trim() }];
    }
    return typeof issue?.message === 'string' ? [{ field: issue.field || '', message: issue.message }] : [];
  });
}
