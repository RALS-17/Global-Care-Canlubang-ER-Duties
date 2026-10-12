import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CurrentShiftBanner } from './components/CurrentShiftBanner';
import { StaffPanel } from './components/StaffPanel';
import { VideoAds } from './components/VideoAds';
import { FooterSchedule } from './components/FooterSchedule';
import { useCurrentShift } from './hooks/useCurrentShift';
import { useSchedule } from './hooks/useSchedule';
import { AdminPage } from './pages/AdminPage';
import { ADMIN_PASSWORD } from './config';
import './App.css';

function DisplayBoard() {
  const currentShift = useCurrentShift();
  const { data, source } = useSchedule();
  const shift = data.shifts[currentShift];

  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('er_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [showLogin, setShowLogin] = useState(false);
  const [loginPw, setLoginPw] = useState('');
  const [loginErr, setLoginErr] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try {
      localStorage.setItem('er_theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const toggleTheme = useCallback(() => {
    setDark((d) => !d);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSignIn = useCallback(() => {
    setShowLogin(true);
    setLoginPw('');
    setLoginErr('');
  }, []);

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPw === ADMIN_PASSWORD) {
      sessionStorage.setItem('er_admin', '1');
      window.location.href = '/admin';
      return;
    }
    setLoginErr('Wrong password');
  };

  return (
    <div className={`app ${dark ? 'theme-dark' : 'theme-light'}`}>
      <Header
        dark={dark}
        onToggleTheme={toggleTheme}
        onFullscreen={toggleFullscreen}
        onSignIn={handleSignIn}
      />
      <CurrentShiftBanner currentShift={currentShift} shift={shift} />

      <main className="main-content layout-2">
        <StaffPanel currentShift={currentShift} shift={shift} />
        <div className="video-slot">
          <VideoAds />
        </div>
      </main>

      <FooterSchedule currentShift={currentShift} data={data} />

      <div className="schedule-source">
        {source === 'supabase' ? 'Live · Supabase' : 'Local data'}
      </div>

      {showLogin && (
        <div className="login-overlay" onClick={() => setShowLogin(false)}>
          <form
            className="login-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitLogin}
          >
            <div className="login-modal-logo">
              <img src="/logo.svg" alt="" width={48} height={48} />
            </div>
            <h2>Admin Sign-In</h2>
            <p>ER Duty Board · Global Care Canlubang</p>
            <input
              type="password"
              placeholder="Password"
              value={loginPw}
              onChange={(e) => setLoginPw(e.target.value)}
              autoFocus
            />
            {loginErr && <div className="login-err">{loginErr}</div>}
            <div className="login-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowLogin(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Sign In
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/admin') {
    return <AdminPage />;
  }

  return <DisplayBoard />;
}

export default App;
