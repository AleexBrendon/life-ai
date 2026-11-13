import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { requestErrorMessage } from '../../lib/requestFeedback';
export default function useResource(path, revision = 0) {
  const key = `${path}:${revision}`, [result, setResult] = useState({ key: null, data: null, error: '' });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api.get(path, { signal: controller.signal }).then(response => { if (!controller.signal.aborted) setResult({ key, data: response.data, error: '' }); }).catch(error => { if (!controller.signal.aborted) setResult({ key, data: null, error: requestErrorMessage(error, 'Não foi possível carregar. Tente novamente.') }); });
    return () => controller.abort();
  }, [path, key]);
  return { data: result.key === key ? result.data : null, loading: !!path && result.key !== key, error: result.key === key ? result.error : '' };
}
