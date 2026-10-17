import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isDemo } from '../lib/supabase';
import PageLoader from '../shared/components/PageLoader';
/**
 * Supabase client is initialized once per page load. A full navigation is
 * required at the boundary so demo data can never share a live auth client.
 */
export default function RouteEnvironment({ children }) {
  const location = useLocation();
  const demoPath = /^\/demo(?:\/|$)/.test(location.pathname);
  const mismatch = demoPath !== isDemo;
  useEffect(() => {
    if (mismatch) window.location.replace(location.pathname + location.search + location.hash);
  }, [mismatch, location.pathname, location.search, location.hash]);
  if (mismatch) return <PageLoader fullPage label="Opening isolated environment…" />;
  return children;
}
