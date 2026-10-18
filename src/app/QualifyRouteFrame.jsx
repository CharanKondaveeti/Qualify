import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PageLoader from '../shared/components/PageLoader';

// This is only a brief visual transition; it does not delay route/data loading.
// Keep active examination pages free of artificial loading or click-blocking.
const TRANSITION_MS = 320;

function skipTransition(pathname) {
  return /^\/candidate\/exams\/[^/]+\/attempts\/[^/]+\/?$/.test(pathname)
    || pathname.startsWith('/demo/student/');
}

export default function QualifyRouteFrame() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => !skipTransition(window.location.pathname));

  useEffect(() => {
    // Queries, hash fragments and state changes within a page never trigger it.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (skipTransition(pathname) || reduceMotion) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return (
    <>
      <Outlet />
      {visible && (
        <div className="qualify-navigation-veil" aria-hidden="true">
          <PageLoader label="Opening QUALIFY…" />
        </div>
      )}
    </>
  );
}
