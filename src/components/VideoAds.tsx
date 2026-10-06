import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

async function toBlobUrl(remoteUrl: string): Promise<string> {
  const res = await fetch(remoteUrl, {
    mode: 'cors',
    credentials: 'omit',
    cache: 'force-cache',
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
 * Full playlist cycle: play each ad to the end, then next.
 * After the last ad → back to first.
 */
export function VideoAds() {
  const { videos, loading } = useVideos();

  const playlist = useMemo(
    () =>
      videos.map((v) => ({
        url: v.public_url,
        name: v.name,
        id: v.id,
      })),
    [videos]
  );

  const playlistId = useMemo(
    () => playlist.map((p) => `${p.id}:${p.url}`).join('|'),
    [playlist]
  );

  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('Loading…');
  const [hasSound, setHasSound] = useState(false);
  const [debug, setDebug] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const playlistRef = useRef(playlist);
  const hasSoundRef = useRef(false);
  const playGenRef = useRef(0);
  const loadedKeyRef = useRef('');

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    hasSoundRef.current = hasSound;
  }, [hasSound]);

  // Playlist changed (upload/reorder/delete) → start at first
  const prevPlaylistId = useRef('');
  useEffect(() => {
    if (!playlistId) return;
    if (prevPlaylistId.current === playlistId) return;
    const first = prevPlaylistId.current === '';
    prevPlaylistId.current = playlistId;
    loadedKeyRef.current = '';
    if (!first) setIndex(0);
  }, [playlistId]);

  // Unlock sound once
  useEffect(() => {
    const enableSound = () => {
      const el = videoRef.current;
      if (!el) return;
      el.muted = false;
      hasSoundRef.current = true;
      setHasSound(true);
      setStatus('Playing with Sound');
      el.play().catch(() => {});
    };
    const evts = ['click', 'touchstart', 'keydown'] as const;
    evts.forEach((e) => document.addEventListener(e, enableSound, { once: true }));
    return () => {
      evts.forEach((e) => document.removeEventListener(e, enableSound));
    };
  }, []);

  /** Advance to next ad — used by onEnded on the <video> element */
  const playNext = useCallback(() => {
    const len = playlistRef.current.length;
    if (len === 0) return;
    setIndex((prev) => {
      const next = prev + 1;
      return next >= len ? 0 : next;
    });
  }, []);

  const handleEnded = useCallback(() => {
    setError(false);
    setStatus('Next video…');
    // Clear loaded key so next index always loads
    loadedKeyRef.current = '';
    playNext();
  }, [playNext]);

  const handleError = useCallback(() => {
    const el = videoRef.current;
    setError(true);
    setStatus('Skipping…');
    setDebug(`err ${el?.error?.code ?? '?'}`);
    loadedKeyRef.current = '';
    window.setTimeout(() => {
      setError(false);
      playNext();
    }, 1200);
  }, [playNext]);

  const handlePlaying = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const w = el.videoWidth;
    const h = el.videoHeight;
    if (w > 0 && h > 0) {
      setError(false);
      setDebug(`${w}x${h}`);
      setStatus(
        hasSoundRef.current
          ? 'Playing with Sound'
          : 'Playing (click for sound)'
      );
    }
  }, []);

  // Load current index
  useEffect(() => {
    const el = videoRef.current;
    if (!el || playlist.length === 0) return;

    const item = playlist[index % playlist.length];
    if (!item) return;

    const key = `${index}::${item.id}::${item.url}`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    const gen = ++playGenRef.current;

    const run = async () => {
      setError(false);
      setStatus('Loading…');

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      el.pause();
      el.loop = false;
      el.removeAttribute('src');
      // clear sources
      while (el.firstChild) el.removeChild(el.firstChild);
      el.load();

      let playUrl = item.url;
      try {
        setStatus('Downloading…');
        const blobUrl = await toBlobUrl(item.url);
        if (gen !== playGenRef.current) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        blobUrlRef.current = blobUrl;
        playUrl = blobUrl;
      } catch {
        playUrl = item.url;
        if (gen !== playGenRef.current) return;
      }

      if (gen !== playGenRef.current) return;

      el.src = playUrl;
      el.loop = false;
      el.muted = !hasSoundRef.current;
      el.load();

      try {
        await el.play();
        if (gen !== playGenRef.current) return;
        setStatus(
          hasSoundRef.current
            ? 'Playing with Sound'
            : 'Playing (click for sound)'
        );
      } catch {
        try {
          el.muted = true;
          await el.play();
          if (gen !== playGenRef.current) return;
          setStatus('Playing (click for sound)');
        } catch {
          if (gen !== playGenRef.current) return;
          setStatus('Click anywhere to start');
        }
      }
    };

    run();
  }, [index, playlistId, playlist]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = !hasSound;
  }, [hasSound]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (loading && playlist.length === 0) {
    return (
      <div className="video-ads" style={panelStyle}>
        <div className="video-error">Loading videos…</div>
      </div>
    );
  }

  if (playlist.length === 0) {
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

  const safeIndex = index % playlist.length;
  const currentName = playlist[safeIndex]?.name || '';

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
        onEnded={handleEnded}
        onError={handleError}
        onPlaying={handlePlaying}
        onWaiting={() => setStatus('Buffering…')}
      />

      {!hasSound && !error && (
        <div className="sound-hint">🔊 Click anywhere for sound</div>
      )}

      {error && (
        <div className="video-error">
          <div>⚠️ Could not display video</div>
          <div style={{ fontSize: '0.85rem', marginTop: 8 }}>{currentName}</div>
        </div>
      )}

      <div className="ad-label">
        AD CYCLE • {safeIndex + 1}/{playlist.length} • {status}
        {debug ? ` · ${debug}` : ''}
      </div>
      <div className="ad-title">{currentName}</div>
    </div>
  );
}
