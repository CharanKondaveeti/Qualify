import { isDemo } from '../../../lib/supabase';
export default function DemoOnly({children}) {
  if(!isDemo) return <main className="portal-message"><h1>Demo session unavailable</h1><p>Reload this page to enter the isolated demonstration.</p><a href="/demo">Open demo</a></main>;
  return children;
}
