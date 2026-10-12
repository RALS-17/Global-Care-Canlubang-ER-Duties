import { useClock } from '../hooks/useClock';

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  onFullscreen: () => void;
  onSignIn: () => void;
}

export function Header({ dark, onToggleTheme, onFullscreen, onSignIn }: Props) {
  const { time, date } = useClock();

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <img
            src="/logo.svg"
            alt="Global Care Canlubang"
            width="44"
            height="44"
            className="logo-img"
          />
        </div>
        <div className="header-titles">
          <h1 className="header-title">ER Duty Board</h1>
          <p className="header-sub">
            Global Care Canlubang · Real-time Emergency Room On-Duty Team
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-clock">
          <span className="clock-time">{time}</span>
          <span className="clock-date">{date}</span>
        </div>
        <button
          type="button"
          className={`hdr-btn ${!dark ? 'active' : ''}`}
          onClick={onToggleTheme}
          title="Light theme"
        >
          Light
        </button>
        <button
          type="button"
          className={`hdr-btn ${dark ? 'active' : ''}`}
          onClick={onToggleTheme}
          title="Dark theme"
        >
          Dark
        </button>
        <button
          type="button"
          className="hdr-btn"
          onClick={onFullscreen}
          title="Fullscreen"
        >
          ⛶ Fullscreen
        </button>
        <button
          type="button"
          className="hdr-btn primary"
          onClick={onSignIn}
        >
          Admin Sign-In
        </button>
      </div>
    </header>
  );
}
