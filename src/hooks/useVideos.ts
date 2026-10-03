import { useState, useEffect } from 'react';
import { supabase, type VideoRow } from '../lib/supabase';
import { DATA_REFRESH_MS, isSupabaseConfigured } from '../config';

export function useVideos() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
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
      setVideos((data as VideoRow[]) || []);
    } catch (err) {
      console.warn('Videos fetch failed:', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    const timer = setInterval(fetchVideos, DATA_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return { videos, loading, refresh: fetchVideos };
}
