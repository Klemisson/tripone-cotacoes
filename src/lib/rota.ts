import { useEffect, useState } from 'react';

export function useRota(): string[] {
  const ler = () => (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
  const [r, setR] = useState(ler);
  useEffect(() => {
    const f = () => setR(ler());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}
export const ir = (caminho: string) => {
  location.hash = '#/' + caminho;
};
