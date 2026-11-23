import { useEffect, useRef } from 'react';
import { startAutoRevalidation } from '../autoRevalidate';

export const useAutoRevalidate = (revalidate: () => Promise<unknown>, enabled: boolean) => {
  const latest = useRef(revalidate);
  latest.current = revalidate;
  useEffect(() => {
    if (enabled) return startAutoRevalidation(() => latest.current());
  }, [enabled]);
};
