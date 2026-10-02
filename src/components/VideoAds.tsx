import { useState, useRef, useEffect } from 'react';

/**
 * Exact filenames from your public/ads folder
 */
const VIDEO_SOURCES = [
  '/ads/ACCREDITATION.mp4',
  '/ads/BREASTFEEDING.mp4',
  '/ads/BUNTIS DAY 2024.mp4',
  '/ads/global greeting.mp4',
  '/ads/GMCL.mp4',
  '/ads/MEDRECORDS.mp4',
  '/ads/TB DOTS (TB ay Tuldukan!).mp4',
  '/ads/Things to Know About TB.mp4',
  '/ads/TDAP VACCINE1.mp4',
  '/ads/FLU VACCINE1.mp4',
];

export function VideoAds() {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [hasSound, setHasSound] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Try to enable sound as early as possible
  useEffect(() => {
    const enableSound = () => {
      const video = videoRef.current;
      if (!video) return;

      video.muted = false;
      setHasSound(true);
      setStatus('Playing with Sound');
      video.play().catch(() => {});
    };

    // Listen for any user interaction on the whole page
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((evt) => {
      document.addEventListener(evt, enableSound, { once: true });
    });

    return () => {
      events.forEach((evt) => {
        document.removeEventListener(evt, enableSound);
      });
    };
  }, []);

  // When a video ends → play the next one
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIndex((prev) => (prev + 1) % VIDEO_SOURCES.length);
      setError(false);
    };

    const handleError = () => {
      console.warn('Failed to load:', VIDEO_SOURCES[index]);
      setError(true);
      setStatus('File not found – skipping...');
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % VIDEO_SOURCES.length);
      }, 3000);
    };

    const handlePlaying = () => {
      setError(false);
      setStatus(hasSound ? 'Playing with Sound' : 'Playing (click anywhere for sound)');
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [index, hasSound]);

  // Load & try to play with sound
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setStatus('Loading...');
    
    // Always try with sound first
    video.muted = !hasSound;
    video.load();

    const tryPlay = async () => {
      try {
        // First attempt: with sound
        video.muted = false;
        await video.play();
        setHasSound(true);
        setStatus('Playing with Sound');
      } catch {
        // Browser blocked sound → fall back to muted so video still plays
        try {
          video.muted = true;
          await video.play();
          setStatus('Playing (click anywhere for sound)');
        } catch {
          setStatus('Click anywhere to start');
        }
      }
    };

    tryPlay();
  }, [index, hasSound]);

  const currentName = VIDEO_SOURCES[index]
    .replace('/ads/', '')
    .replace('.mp4', '');

  return (
    <div className="video-ads">
      <video
        ref={videoRef}
        className="video-player"
        src={VIDEO_SOURCES[index]}
        playsInline
        autoPlay
      />

      {/* Small hint only when sound is not yet enabled */}
      {!hasSound && !error && (
        <div className="sound-hint">
          🔊 Click anywhere for sound
        </div>
      )}

      {error && (
        <div className="video-error">
          <div>⚠️ Video not found</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8, opacity: 0.8 }}>
            {currentName}
          </div>
        </div>
      )}

      <div className="ad-label">
        AD CYCLE • {index + 1}/{VIDEO_SOURCES.length} • {status}
      </div>
      <div className="ad-title">{currentName}</div>
    </div>
  );
}
