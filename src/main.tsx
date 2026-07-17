import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import {
  clerkPublishableKey,
  hasClerk,
  setClerkSignOut,
  setClerkTokenGetter,
} from './lib/clerk';

// Self-hosted fonts (SEC-5): bundled by Vite instead of Google Fonts/Fontshare
// CDNs, so no third-party requests and a strict CSP font-src 'self' holds.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/sora/400.css';
import '@fontsource/sora/500.css';
import '@fontsource/sora/600.css';
import '@fontsource/sora/700.css';
import '@fontsource/sora/800.css';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';

import './index.css';
import App from './App.tsx';

// Pushes the live Clerk token + sign-out into the module bridge so the
// auth-agnostic apiClient / AppDataContext can reach Clerk without importing
// its hooks. Rendered only inside <ClerkProvider>.
function ClerkBridge() {
  const { getToken, signOut } = useAuth();
  useEffect(() => {
    setClerkTokenGetter(async () => (await getToken()) ?? null);
    setClerkSignOut(async () => {
      await signOut();
    });
  }, [getToken, signOut]);
  return null;
}

if (!hasClerk) {
  // Not an error — the app is local-first by design and degrades cleanly.
  console.warn(
    '[SignBridge] VITE_CLERK_PUBLISHABLE_KEY not set — running local-first without Clerk auth. ' +
      'Sync + server API stay dormant until a key is provided.',
  );
}

const tree = (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  hasClerk ? (
    <ClerkProvider publishableKey={clerkPublishableKey!}>
      <ClerkBridge />
      {tree}
    </ClerkProvider>
  ) : (
    tree
  ),
);
