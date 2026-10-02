import { Header } from './components/Header';
import { CurrentShiftBanner } from './components/CurrentShiftBanner';
import { StaffPanel } from './components/StaffPanel';
import { VideoAds } from './components/VideoAds';
import { FooterSchedule } from './components/FooterSchedule';
import { useCurrentShift } from './hooks/useCurrentShift';
import { useSchedule } from './hooks/useSchedule';
import './App.css';

function App() {
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

      {/* Small indicator so you know if Google Sheet is connected */}
      <div className="schedule-source">
        Schedule: {source === 'google' ? 'Google Sheet ✓' : 'Local data'}
      </div>
    </div>
  );
}

export default App;
