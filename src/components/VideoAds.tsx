import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useVideos } from '../hooks/useVideos';

const panelStyle: React.CSSProperties = {
  background: '#000',
  overflow: 'hidden',
  borderRadius: 4,
  width: '100%',
  height: '100%',
  position: 'relative',
};

const videoStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
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
 * After the last ad → back to first. No on-screen labels.
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
  const [hasSound, setHasSound] = useState(false);

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

  const prevPlaylistId = useRef('');
  useEffect(() => {
    if (!playlistId) return;
    if (prevPlaylistId.current === playlistId) return;
    const first = prevPlaylistId.current === '';
    prevPlaylistId.current = playlistId;
    loadedKeyRef.current = '';
    if (!first) setIndex(0);
  }, [playlistId]);

  // Unlock sound once on user gesture
  useEffect(() => {
    const enableSound = () => {
      const el = videoRef.current;
      if (!el) return;
      el.muted = false;
      hasSoundRef.current = true;
      setHasSound(true);
      el.play().catch(() => {});
    };
    const evts = ['click', 'touchstart', 'keydown'] as const;
    evts.forEach((e) => document.addEventListener(e, enableSound, { once: true }));
    return () => {
      evts.forEach((e) => document.removeEventListener(e, enableSound));
    };
  }, []);

  const playNext = useCallback(() => {
    const len = playlistRef.current.length;
    if (len === 0) return;
    setIndex((prev) => {
      const next = prev + 1;
      return next >= len ? 0 : next;
    });
  }, []);

  const handleEnded = useCallback(() => {
    loadedKeyRef.current = '';
    playNext();
  }, [playNext]);

  const handleError = useCallback(() => {
    loadedKeyRef.current = '';
    window.setTimeout(() => {
      playNext();
    }, 1200);
  }, [playNext]);

  const handlePlaying = useCallback(() => {
    // no UI labels – playback only
  }, []);

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
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      el.pause();
      el.loop = false;
      el.removeAttribute('src');
      while (el.firstChild) el.removeChild(el.firstChild);
      el.load();

      let playUrl = item.url;
      try {
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
      } catch {
        try {
          el.muted = true;
          await el.play();
        } catch {
          // wait for user click
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
    return <div className="video-ads" style={panelStyle} />;
  }

  if (playlist.length === 0) {
    return <div className="video-ads" style={panelStyle} />;
  }

  return (
    <div className="video-ads" style={panelStyle} title="Click for sound">
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
      />
    </div>
  );
}
