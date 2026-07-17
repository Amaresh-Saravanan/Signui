// Clerk integration seam (M5 tasks 5.1/5.2).
//
// `hasClerk` is a BUILD-TIME constant (from the env var), so components can
// branch on it without violating the rules of hooks — the branch never changes
// at runtime.
//
// The token/sign-out bridge lets the auth-agnostic apiClient and AppDataContext
// reach Clerk WITHOUT importing Clerk hooks directly. A tiny <ClerkBridge>
// mounted inside <ClerkProvider> (see main.tsx) pushes the real getters in via
// setClerkTokenGetter/setClerkSignOut. Until then these are safe no-ops, which
// is exactly what keeps the app buildable and runnable before secrets exist.

export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const hasClerk = Boolean(clerkPublishableKey);

type TokenGetter = () => Promise<string | null>;
type SignOutFn = () => Promise<void>;

let tokenGetter: TokenGetter = async () => null;
let signOutFn: SignOutFn = async () => {};

export function setClerkTokenGetter(fn: TokenGetter): void {
  tokenGetter = fn;
}

/** Resolves the current Clerk session token, or null when unauthenticated /
 *  Clerk not configured. apiClient passes this as the Bearer token. */
export function getClerkToken(): Promise<string | null> {
  return tokenGetter();
}

export function setClerkSignOut(fn: SignOutFn): void {
  signOutFn = fn;
}

/** Ends the Clerk session (no-op when Clerk isn't configured). */
export function clerkSignOut(): Promise<void> {
  return signOutFn();
}
