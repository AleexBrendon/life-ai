import { useEffect, useState } from 'react';

export default function useUnsavedChanges(value) {
  const serialized = JSON.stringify(value);
  const [initial] = useState(serialized);
  const dirty = serialized !== initial;
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);
  return dirty;
}
