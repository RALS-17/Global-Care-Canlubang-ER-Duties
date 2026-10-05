import { useState, useRef, useEffect, useMemo } from 'react';
import { useVideos } from '../hooks/useVideos';

const panelStyle: React.CSSProperties = {
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
 * Download remote file → blob URL (stable playback on Vercel).
 */
async function toBlobUrl(remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl, {
    mode: 'cors',
    credentials: 'omit',
    cache: 'default',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const typed =
    blob.type && blob.type.startsWith('video/')
      ? blob
      : new Blob([blob], { type: 'video/mp4' });
  return URL.createObjectURL(typed);
}

/**
 * Full-length ads. Advances only on `ended`.
 * Loops the whole playlist only after the last video finishes.
 */
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
  const [status, setStatus] = useState('Loading…');
  const [hasSound, setHasSound] = useState(false);
  const [debug, setDebug] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const indexRef = useRef(0);
  const listLenRef = useRef(0);
  const loadingRef = useRef(false);
  const hasSoundRef = useRef(false);
  const lastListKeyRef = useRef('');

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    listLenRef.current = remoteUrls.length;
  }, [remoteUrls.length]);

  useEffect(() => {
    hasSoundRef.current = hasSound;
  }, [hasSound]);

  // Only reset playlist when the URL list actually changes (not every poll)
  useEffect(() => {
    if (listKey && listKey !== lastListKeyRef.current) {
      lastListKeyRef.current = listKey;
      setIndex(0);
    }
  }, [listKey]);

  // Unlock sound once – do NOT reload the video
  useEffect(() => {
    const enableSound = () => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = false;
      hasSoundRef.current = true;
      setHasSound(true);
      setStatus('Playing with Sound');
      video.play().catch(() => {});
    };
    const events = ['click', 'touchstart', 'keydown'] as const;
    events.forEach((e) =>
      document.addEventListener(e, enableSound, { once: true })
    );
    return () => {
      events.forEach((e) =>
        document.removeEventListener(e, enableSound)
      );
    };
  }, []);

  // Media listeners – advance ONLY when a video truly ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => {
      const len = listLenRef.current;
      if (len === 0) return;
      // Next index; after last video → back to 0 (full playlist loop only)
      setIndex((prev) => (prev + 1) % len);
      setError(false);
    };

    const onError = () => {
      const code = video.error?.code;
      setError(true);
      setStatus('Skipping…');
      setDebug(code ? `media err ${code}` : 'media error');
      const len = listLenRef.current;
      if (len === 0) return;
      // Skip broken file after a short pause, still sequential
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % len);
        setError(false);
      }, 2000);
    };

    const onPlaying = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      setDebug(`${w}x${h}`);
      if (w > 0 && h > 0) {
        setError(false);
        setStatus(
          hasSoundRef.current
            ? 'Playing with Sound'
            : 'Playing (click for sound)'
        );
      } else {
        setError(true);
        setStatus('Audio only – bad encode');
      }
    };

    const onTimeUpdate = () => {
      // Keep status honest while playing through long ads
      if (!video.paused && video.videoWidth > 0 && !video.ended) {
        setStatus(
          hasSoundRef.current
            ? 'Playing with Sound'
            : 'Playing (click for sound)'
        );
      }
    };

    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', () => setStatus('Buffering…'));
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  // Load video when INDEX or playlist changes — NOT when sound toggles
  useEffect(() => {
    const video = videoRef.current;
    if (!video || remoteUrls.length === 0) return;
    if (loadingRef.current) return;

    let cancelled = false;
    const remote = remoteUrls[index % remoteUrls.length];
    if (!remote) return;

    const run = async () => {
      loadingRef.current = true;
      setError(false);
      setStatus('Loading…');
      setDebug('');

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
          loadingRef.current = false;
          return;
        }
        blobUrlRef.current = playUrl;
        setDebug('blob');
      } catch (e) {
        console.warn('Blob fetch failed, direct URL:', e);
        playUrl = remote;
        setDebug('direct');
      }

      if (cancelled) {
        loadingRef.current = false;
        return;
      }

      video.src = playUrl;
      video.muted = !hasSoundRef.current;
      // Ensure we don't loop a single file – playlist handles repeat
      video.loop = false;
      video.load();

      try {
        await video.play();
        setStatus(
          hasSoundRef.current
            ? 'Playing with Sound'
            : 'Playing (click for sound)'
        );
      } catch {
        try {
          video.muted = true;
          await video.play();
          setStatus('Playing (click for sound)');
        } catch {
          setStatus('Click anywhere to start');
        }
      }
      loadingRef.current = false;
    };

    run();

    return () => {
      cancelled = true;
      loadingRef.current = false;
    };
  }, [index, listKey, remoteUrls]);

  // Mute flag only – never reload
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = !hasSound;
  }, [hasSound]);

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
        loop={false}
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
