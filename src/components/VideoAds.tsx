import { useState, useRef, useEffect, useMemo } from 'react';
import { useVideos } from '../hooks/useVideos';

/**
 * Only plays videos uploaded via Admin → Supabase.
 */
export function VideoAds() {
  const { videos, loading } = useVideos();

  // Stable list – prevents constant reload / black flicker
  const sources = useMemo(
    () => videos.map((v) => v.public_url),
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

  // Reset to first video only when the playlist actually changes
  useEffect(() => {
    setIndex(0);
  }, [sourcesKey]);

  // One-time: unlock sound on first user gesture
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

  // Attach media event listeners once (use refs for latest index)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (sources.length === 0) return;
      setIndex((prev) => (prev + 1) % sources.length);
      setError(false);
    };

    const handleError = () => {
      console.warn('Failed to load video at index', indexRef.current);
      setError(true);
      setStatus('Skipping…');
      if (sources.length === 0) return;
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % sources.length);
      }, 2500);
    };

    const handlePlaying = () => {
      setError(false);
      setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
    };

    const handleWaiting = () => {
      setStatus('Buffering…');
    };

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
  }, [sources.length, hasSound]);

  // Load & play only when index or playlist changes — NOT every render
  useEffect(() => {
    const video = videoRef.current;
    if (!video || sources.length === 0) return;

    const src = sources[index % sources.length];
    if (!src) return;

    setError(false);
    setStatus('Loading...');

    // Only change src when needed (avoids black flicker)
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
  }, [index, sourcesKey, hasSound]);

  // Keep muted flag in sync without reloading
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
          <div>⚠️ Could not play video</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8, opacity: 0.8 }}>
            {currentName}
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
