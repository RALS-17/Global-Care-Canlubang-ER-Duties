import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type VideoRow } from '../lib/supabase';
import { DATA_REFRESH_MS, isSupabaseConfigured } from '../config';

function playlistFingerprint(rows: VideoRow[]): string {
  return rows.map((v) => `${v.id}:${v.sort_order}:${v.public_url}`).join('|');
}

export function useVideos() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fpRef = useRef('');

  const fetchVideos = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setVideos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = (data as VideoRow[]) || [];
      const fp = playlistFingerprint(rows);

      // Only update React state when playlist truly changes
      // (prevents mid-video restart every 30s poll)
      if (fp !== fpRef.current) {
        fpRef.current = fp;
        setVideos(rows);
      }
    } catch (err) {
      console.warn('Videos fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
    const timer = setInterval(fetchVideos, DATA_REFRESH_MS);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('videos-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'videos' },
          () => {
            fetchVideos();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchVideos]);

  return { videos, loading, refresh: fetchVideos };
}
