import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

interface RequireAuthProps {
  /** When true (default), an authenticated-but-not-onboarded user is sent to
   *  onboarding. Set false for the onboarding routes themselves. */
  requireOnboarded?: boolean;
}

/**
 * Route guard (FR-2). Used as a layout route wrapping protected children.
 * Unauthenticated users are redirected to /auth with a ?redirect= back-link.
 */
export function RequireAuth({ requireOnboarded = true }: RequireAuthProps) {
  const { isAuthenticated, state } = useAppData();
  const location = useLocation();

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (requireOnboarded && !state.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
