import { createClient } from "@supabase/supabase-js";
import { createDemoClient } from "./demoClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production-safe, strictly route-scoped demo. No query parameters or session flags.
// Demo routes instantiate a browser-local client and never touch real Supabase.
export const isDemoAvailable = true;
export const isDemo = /^\/demo(?:\/|$)/.test(window.location.pathname);
export const isConfigured = Boolean(supabaseUrl && supabaseKey);
const supabase = isDemo ? createDemoClient() : createClient(supabaseUrl || 'https://unconfigured.supabase.co', supabaseKey || 'unconfigured');
// Capture recovery before React mounts; the SDK consumes the email-link tokens.
export const recoveryMarker = 'qualify-password-recovery';
if (!isDemo) supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session?.user) {
    sessionStorage.setItem(recoveryMarker, JSON.stringify({ user: session.user.id, at: Date.now() }));
  } else if (event === 'SIGNED_OUT') sessionStorage.removeItem(recoveryMarker);
});
export default supabase;
