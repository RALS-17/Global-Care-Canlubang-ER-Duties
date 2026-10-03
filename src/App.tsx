import { Header } from './components/Header';
import { CurrentShiftBanner } from './components/CurrentShiftBanner';
import { StaffPanel } from './components/StaffPanel';
import { VideoAds } from './components/VideoAds';
import { FooterSchedule } from './components/FooterSchedule';
import { useCurrentShift } from './hooks/useCurrentShift';
import { useSchedule } from './hooks/useSchedule';
import { AdminPage } from './pages/AdminPage';
import './App.css';

function DisplayBoard() {
  const currentShift = useCurrentShift();
  const { data, source } = useSchedule();
  const shift = data.shifts[currentShift];

  return (
    <div className="app">
      <Header />
      <CurrentShiftBanner currentShift={currentShift} shift={shift} />

      <main className="main-content">
        <StaffPanel currentShift={currentShift} shift={shift} />
        <VideoAds />
      </main>

      <FooterSchedule currentShift={currentShift} data={data} />

      <div className="schedule-source">
        Schedule: {source === 'supabase' ? 'Supabase ✓' : 'Local data'}
      </div>
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
