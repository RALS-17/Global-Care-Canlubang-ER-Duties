import { useClock } from '../hooks/useClock';

export function Header() {
  const { time, date } = useClock();

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <img
            src="/logo.svg"
            alt="Global Care Canlubang Logo"
            width="56"
            height="56"
            className="logo-img"
          />
        </div>
        <div className="hospital-lockup">
          <span className="hospital-line1">GLOBAL CARE</span>
          <span className="hospital-rule" aria-hidden="true" />
          <span className="hospital-line2">CANLUBANG</span>
        </div>
      </div>

      <div className="header-center">ON DUTY TEAM · ER</div>

      <div className="header-right">
        <div className="clock">{time}</div>
        <div className="date">{date}</div>
      </div>
    </header>
  );
}
