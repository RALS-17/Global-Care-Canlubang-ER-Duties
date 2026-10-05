import { useState, useRef, useEffect, useMemo } from 'react';
import { useVideos } from '../hooks/useVideos';

/** Fix spaces / special chars in Supabase public URLs */
function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Re-encode each path segment safely
    u.pathname = u.pathname
      .split('/')
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return u.toString();
  } catch {
    return url.replace(/ /g, '%20');
  }
}

/**
 * Only plays videos uploaded via Admin → Supabase.
 * Browser-friendly tip: use H.264 MP4 (not HEVC / huge HI RES files).
 */
export function VideoAds() {
  const { videos, loading } = useVideos();

  const sources = useMemo(
    () => videos.map((v) => safeUrl(v.public_url)),
    [videos]
  );
  const names = useMemo(
    () => videos.map((v) => v.name),
    [videos]
  );
  const sourcesKey = useMemo(() => sources.join('|'), [sources]);

  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [hasSound, setHasSound] = useState(false);
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
    events.forEach((evt) => {
      document.addEventListener(evt, enableSound, { once: true });
    });
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, enableSound));
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
      console.warn('Video error:', sources[indexRef.current]);
      setError(true);
      setStatus('Skipping…');
      if (sources.length === 0) return;
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % sources.length);
        setError(false);
      }, 2000);
    };

    const handlePlaying = () => {
      setError(false);
      setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
    };

    const handleWaiting = () => setStatus('Buffering…');
    const handleCanPlay = () => {
      setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
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

    if (video.getAttribute('data-src') !== src) {
      video.setAttribute('data-src', src);
      video.src = src;
      video.load();
    }

    video.muted = !hasSound;

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
      <div className="video-ads">
        <div className="video-error">
          <div>Loading videos…</div>
        </div>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="video-ads">
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

  return (
    <div className="video-ads">
      <video
        ref={videoRef}
        className="video-player"
        playsInline
        autoPlay
        preload="auto"
      />

      {!hasSound && !error && (
        <div className="sound-hint">🔊 Click anywhere for sound</div>
      )}

      {error && (
        <div className="video-error">
          <div>⚠️ Could not play this file</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8, opacity: 0.85 }}>
            {currentName}
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: 10, opacity: 0.65, maxWidth: '80%' }}>
            Use H.264 MP4 (720p). HI RES / HEVC often fails in browsers.
          </div>
        </div>
      )}

      <div className="ad-label">
        AD CYCLE • {safeIndex + 1}/{sources.length} • {status}
      </div>
      <div className="ad-title">{currentName}</div>
    </div>
  );
}
