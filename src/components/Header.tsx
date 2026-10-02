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
            width="48" 
            height="48"
            className="logo-img"
          />
        </div>
        <span className="hospital-name">GLOBAL CARE CANLUBANG – ER</span>
      </div>

      <div className="header-center">ON DUTY TEAM</div>

      <div className="header-right">
        <div className="clock">{time}</div>
        <div className="date">{date}</div>
      </div>
    </header>
  );
}
