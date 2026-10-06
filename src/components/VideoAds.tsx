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
 * Playlist rules:
 * - Each video plays to the very end (never cut mid-way by polls)
 * - Advance only on HTML5 `ended` (or hard error skip)
 * - After the LAST video ends → go to index 0 (full cycle complete)
 * - Same video must never restart unless it is the only item and it ended
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

  // Stable string: only changes when order/urls change
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
  const indexRef = useRef(0);
  const hasSoundRef = useRef(false);
  const playGenRef = useRef(0); // ignores stale async loads
  const activeSrcRef = useRef(''); // what we intentionally loaded

  // Keep refs in sync without retriggering playback
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    hasSoundRef.current = hasSound;
  }, [hasSound]);

  // If playlist identity changes (reorder/upload/delete), start from #1
  // Do NOT run on every identical poll.
  const prevPlaylistId = useRef('');
  useEffect(() => {
    if (!playlistId) return;
    if (prevPlaylistId.current === playlistId) return;
    const isFirst = prevPlaylistId.current === '';
    prevPlaylistId.current = playlistId;
    if (!isFirst) {
      setIndex(0);
    }
  }, [playlistId]);

  // Sound unlock – mute flag only
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

  // Wire ended / error once
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const goNext = () => {
      const len = playlistRef.current.length;
      if (len === 0) return;
      // 0..len-1 then wrap — full cycle before repeat
      setIndex((prev) => {
        const next = prev + 1;
        return next >= len ? 0 : next;
      });
    };

    const onEnded = () => {
      // Only advance when this clip finished naturally
      setError(false);
      goNext();
    };

    const onError = () => {
      setError(true);
      setStatus('Skipping broken file…');
      setDebug(`err ${el.error?.code ?? '?'}`);
      // Skip to next after brief pause (does not restart same file in a loop)
      window.setTimeout(() => {
        goNext();
        setError(false);
      }, 1500);
    };

    const onPlaying = () => {
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
    };

    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('waiting', () => setStatus('Buffering…'));

    return () => {
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
      el.removeEventListener('playing', onPlaying);
    };
  }, []);

  // Load ONLY when index or playlistId changes — never on poll noise
  useEffect(() => {
    const el = videoRef.current;
    const list = playlistRef.current;
    if (!el || list.length === 0) return;

    const item = list[index % list.length];
    if (!item) return;

    // Same source already playing → do nothing (prevents cut/restart)
    const intentKey = `${index}|${item.url}`;
    if (activeSrcRef.current === intentKey && !el.ended && el.src) {
      return;
    }
    activeSrcRef.current = intentKey;

    const gen = ++playGenRef.current;

    const run = async () => {
      setError(false);
      setStatus('Loading…');
      setDebug('');

      // Revoke previous blob
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      el.pause();
      el.loop = false;
      el.removeAttribute('src');
      el.load();

      let playUrl = item.url;
      try {
        setStatus('Downloading…');
        playUrl = await toBlobUrl(item.url);
        if (gen !== playGenRef.current) {
          URL.revokeObjectURL(playUrl);
          return; // stale
        }
        blobUrlRef.current = playUrl;
      } catch {
        playUrl = item.url; // direct fallback
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
  }, [index, playlistId]);

  // Unmute only — never reload
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
