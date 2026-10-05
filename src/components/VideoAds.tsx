import { useState, useRef, useEffect, useMemo } from 'react';
import { useVideos } from '../hooks/useVideos';

const panelStyle: React.CSSProperties = {
  /* Position/size come from CSS absolute rules – do not override */
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

/**
 * Load via fetch → blob URL so playback is same-origin to the page.
 * Fixes many "works on localhost, black on Vercel" cases with Supabase Storage.
 */
async function toBlobUrl(remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl, {
    mode: 'cors',
    credentials: 'omit',
    cache: 'default',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  // Force a video mime if storage sent octet-stream
  const typed =
    blob.type && blob.type.startsWith('video/')
      ? blob
      : new Blob([blob], { type: 'video/mp4' });
  return URL.createObjectURL(typed);
}

export function VideoAds() {
  const { videos, loading } = useVideos();

  const remoteUrls = useMemo(
    () => videos.map((v) => v.public_url),
    [videos]
  );
  const names = useMemo(() => videos.map((v) => v.name), [videos]);
  const listKey = useMemo(() => remoteUrls.join('|'), [remoteUrls]);

  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Loading...');
  const [hasSound, setHasSound] = useState(false);
  const [debug, setDebug] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setIndex(0);
  }, [listKey]);

  // Unlock audio on first gesture
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
    events.forEach((e) => document.addEventListener(e, enableSound, { once: true }));
    return () => {
      events.forEach((e) => document.removeEventListener(e, enableSound));
    };
  }, []);

  // Media events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      if (remoteUrls.length === 0) return;
      setIndex((i) => (i + 1) % remoteUrls.length);
      setError(false);
    };

    const onError = () => {
      const code = video.error?.code;
      setError(true);
      setStatus('Skipping…');
      setDebug(code ? `media err ${code}` : 'media error');
      if (remoteUrls.length === 0) return;
      setTimeout(() => {
        setIndex((i) => (i + 1) % remoteUrls.length);
        setError(false);
      }, 2500);
    };

    const onPlaying = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      setDebug(`${w}x${h}`);
      if (w > 0 && h > 0) {
        setError(false);
        setStatus(hasSound ? 'Playing with Sound' : 'Playing (click for sound)');
      } else {
        setError(true);
        setStatus('Audio only – bad encode');
      }
    };

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', () => setStatus('Buffering…'));

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('playing', onPlaying);
    };
  }, [remoteUrls, hasSound]);

  // Load current video as blob (preferred) or direct URL fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || remoteUrls.length === 0) return;

    let cancelled = false;
    const remote = remoteUrls[index % remoteUrls.length];

    const run = async () => {
      setError(false);
      setStatus('Loading…');
      setDebug('');

      // Revoke previous blob
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      video.pause();
      video.removeAttribute('src');
      video.load();

      let playUrl = remote;

      try {
        setStatus('Downloading…');
        playUrl = await toBlobUrl(remote);
        if (cancelled) {
          URL.revokeObjectURL(playUrl);
          return;
        }
        blobUrlRef.current = playUrl;
        setDebug('blob');
      } catch (e) {
        console.warn('Blob fetch failed, direct URL:', e);
        playUrl = remote;
        setDebug('direct');
      }

      if (cancelled) return;

      video.src = playUrl;
      video.muted = !hasSound;
      video.load();

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

    run();

    return () => {
      cancelled = true;
    };
  }, [index, listKey, hasSound, remoteUrls]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !hasSound;
  }, [hasSound]);

  // Cleanup blobs on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="video-ads" style={panelStyle}>
        <div className="video-error">Loading videos…</div>
      </div>
    );
  }

  if (remoteUrls.length === 0) {
    return (
      <div className="video-ads" style={panelStyle}>
        <div className="video-error">
          <div>No videos uploaded</div>
          <div style={{ fontSize: '0.9rem', marginTop: 8, opacity: 0.8 }}>
            Upload in Admin → Videos
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = index % remoteUrls.length;
  const currentName = names[safeIndex] || '';

  return (
    <div className="video-ads" style={panelStyle}>
      <video
        ref={videoRef}
        className="video-player"
        style={videoStyle}
        playsInline
        autoPlay
        preload="auto"
      />

      {!hasSound && !error && (
        <div className="sound-hint">🔊 Click anywhere for sound</div>
      )}

      {error && (
        <div className="video-error">
          <div>⚠️ Could not display video</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8 }}>{currentName}</div>
          <div style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.7 }}>
            {debug}
          </div>
        </div>
      )}

      <div className="ad-label">
        AD CYCLE • {safeIndex + 1}/{remoteUrls.length} • {status}
        {debug ? ` · ${debug}` : ''}
      </div>
      <div className="ad-title">{currentName}</div>
    </div>
  );
}
