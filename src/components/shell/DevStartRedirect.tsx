import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Development only: open on a given screen so a dev session can land on the terminal directly.
export function DevStartRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    const route = import.meta.env.DEV ? (import.meta.env.VITE_START_ROUTE as string | undefined) : undefined;
    if (route) nav(route, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
