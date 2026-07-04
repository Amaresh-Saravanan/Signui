import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppDataProvider } from './context/AppDataContext';
import { MainLayout } from './layouts/MainLayout';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { History } from './pages/History';
import { Phrasebook } from './pages/Phrasebook';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { About } from './pages/About';
import { Profile } from './pages/Profile';
import { Contact } from './pages/Contact';
import { Onboarding } from './pages/Onboarding';
import { Permissions } from './pages/Permissions';
import { Preferences } from './pages/Preferences';

function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AppDataProvider>
    </ThemeProvider>
  );
}

export default App;
