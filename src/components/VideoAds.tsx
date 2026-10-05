import { useState, useRef, useEffect, useMemo } from 'react';
import { useVideos } from '../hooks/useVideos';

const panelStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 280,
  background: '#000',
  overflow: 'hidden',
  borderRadius: 6,
};

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: '#000',
  zIndex: 1,
};

const ERR: Record<number, string> = {
  1: 'aborted',
  2: 'network',
  3: 'decode',
  4: 'src not supported',
};

export function VideoAds() {
  const { videos, loading } = useVideos();

  // Use public_url as stored – do not re-encode (can break Supabase paths)
  const sources = useMemo(
    () => videos.map((v) => v.public_url),
    [videos]
  );
  const names = useMemo(() => videos.map((v) => v.name), [videos]);
  const sourcesKey = useMemo(() => sources.join('|'), [sources]);

  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [hasSound, setHasSound] = useState(false);
  const [debug, setDebug] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setIndex(0);
  }, [sourcesKey]);

  useEffect(() => {
    const enableSound = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      setHasSound(true);
      setStatus('Playing with Sound');
      video.play().catch(() => {});
    };
    const events = ['click', 'touchstart', 'keydown'] as const;
    events.forEach((evt) =>
      document.addEventListener(evt, enableSound, { once: true })
    );
    return () => {
      events.forEach((evt) =>
        document.removeEventListener(evt, enableSound)
      );
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (sources.length === 0) return;
      setIndex((prev) => (prev + 1) % sources.length);
      setError(false);
    };

    const handleError = () => {
      const code = video.error?.code ?? 0;
      const msg = ERR[code] || `err ${code}`;
      console.warn('Video error:', msg, sources[indexRef.current]);
      setError(true);
      setStatus('Skipping…');
      setDebug(msg);
      if (sources.length === 0) return;
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % sources.length);
        setError(false);
      }, 3000);
    };

    const handlePlaying = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      setDebug(`${w}x${h}`);
      if (w > 0 && h > 0) {
        setError(false);
        setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
      } else {
        setError(true);
        setStatus('Audio only – need H.264 video');
      }
    };

    const handleWaiting = () => setStatus('Buffering…');
    const handleCanPlay = () => {
      if (video.videoWidth > 0) {
        setError(false);
        setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
      }
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [sources, hasSound]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sources.length === 0) return;

    const src = sources[index % sources.length];
    if (!src) return;

    setError(false);
    setStatus('Loading...');
    setDebug('');

    video.pause();
    video.src = src;
    video.muted = !hasSound;
    video.load();

    const tryPlay = async () => {
      try {
        await video.play();
        if (!video.muted) {
          setHasSound(true);
          setStatus('Playing with Sound');
        } else {
          setStatus('Playing (click for sound)');
        }
      } catch {
        try {
          video.muted = true;
          await video.play();
          setStatus('Playing (click for sound)');
        } catch {
          setStatus('Click anywhere to start');
        }
      }
    };

    tryPlay();
  }, [index, sourcesKey, hasSound, sources]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !hasSound;
  }, [hasSound]);

  if (loading) {
    return (
      <div className="video-ads" style={panelStyle}>
        <div className="video-error">Loading videos…</div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="video-ads" style={panelStyle}>
        <div className="video-error">
          <div>No videos uploaded</div>
          <div style={{ fontSize: '0.9rem', marginTop: 8, opacity: 0.8 }}>
            Upload videos in Admin → Videos
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = index % sources.length;
  const currentName = names[safeIndex] || '';
  const currentSrc = sources[safeIndex] || '';

  return (
    <div className="video-ads" style={panelStyle}>
      <video
        ref={videoRef}
        className="video-player"
        style={videoStyle}
        playsInline
        autoPlay
        preload="auto"
        controls={false}
      />

      {!hasSound && !error && (
        <div className="sound-hint">🔊 Click anywhere for sound</div>
      )}

      {error && (
        <div className="video-error">
          <div>⚠️ Could not display video</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8, opacity: 0.85 }}>
            {currentName}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.65 }}>
            {debug || 'unknown error'}
          </div>
          <div style={{ fontSize: '0.7rem', marginTop: 12, opacity: 0.5, maxWidth: '90%', wordBreak: 'break-all' }}>
            {currentSrc}
          </div>
        </div>
      )}

      <div className="ad-label">
        AD CYCLE • {safeIndex + 1}/{sources.length} • {status}
        {debug ? ` · ${debug}` : ''}
      </div>
      <div className="ad-title">{currentName}</div>
    </div>
  );
}
