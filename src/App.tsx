import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import { MainLayout } from './layouts/MainLayout';

// Route-level code splitting: each page loads on demand so the entry chunk
// stays small and heavy dependencies (MediaPipe via Workspace, framer-motion
// pages) are only fetched when their route is visited.
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Auth = lazy(() => import('./pages/Auth').then(m => ({ default: m.Auth })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Workspace = lazy(() => import('./pages/Workspace').then(m => ({ default: m.Workspace })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Phrasebook = lazy(() => import('./pages/Phrasebook').then(m => ({ default: m.Phrasebook })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const Permissions = lazy(() => import('./pages/Permissions').then(m => ({ default: m.Permissions })));
const Preferences = lazy(() => import('./pages/Preferences').then(m => ({ default: m.Preferences })));

// Lightweight route-transition fallback, theme-aware via CSS variables.
function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public / Full screen routes without standard sidebar */}
              <Route element={<MainLayout hideSidebar />}>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/permissions" element={<Permissions />} />
                <Route path="/preferences" element={<Preferences />} />
              </Route>

              {/* App routes with sidebar */}
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workspace" element={<Workspace />} />
                <Route path="/history" element={<History />} />
                <Route path="/phrasebook" element={<Phrasebook />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/about" element={<About />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/contact" element={<Contact />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppDataProvider>
    </ThemeProvider>
  );
}

export default App;
