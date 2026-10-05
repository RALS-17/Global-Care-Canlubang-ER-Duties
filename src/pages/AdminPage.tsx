import { useState, useEffect, useRef } from 'react';
import { ADMIN_PASSWORD, isSupabaseConfigured, SUPABASE_URL } from '../config';
import { supabase, type ScheduleRow, type VideoRow } from '../lib/supabase';
import type { ShiftKey } from '../types';
import './AdminPage.css';

const SHIFTS: { key: ShiftKey; defaultLabel: string }[] = [
  { key: '6-2', defaultLabel: '06:00 – 14:00 (6-2)' },
  { key: '2-10', defaultLabel: '14:00 – 22:00 (2-10)' },
  { key: '10-6', defaultLabel: '22:00 – 06:00 (10-6)' },
];

type ScheduleForm = Record<
  ShiftKey,
  { label: string; nurses: string; rods: string; consultants: string; shos: string }
>;

const emptyForm = (): ScheduleForm => ({
  '6-2': { label: '06:00 – 14:00 (6-2)', nurses: '', rods: '', consultants: '', shos: '' },
  '2-10': { label: '14:00 – 22:00 (2-10)', nurses: '', rods: '', consultants: '', shos: '' },
  '10-6': { label: '22:00 – 06:00 (10-6)', nurses: '', rods: '', consultants: '', shos: '' },
});

export function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('er_admin') === '1'
  );
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'schedule' | 'videos'>('schedule');

  // Schedule state
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Videos state
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('er_admin', '1');
      setAuthed(true);
      setLoginError('');
    } else {
      setLoginError('Wrong password');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('er_admin');
    setAuthed(false);
  };

  // Load schedule + videos when authenticated
  useEffect(() => {
    if (!authed) return;
    loadSchedule();
    loadVideos();
  }, [authed]);

  const loadSchedule = async () => {
    const { data } = await supabase.from('schedules').select('*');
    if (!data) return;
    const next = emptyForm();
    for (const row of data as ScheduleRow[]) {
      const key = row.shift_key as ShiftKey;
      if (!next[key]) continue;
      next[key] = {
        label: row.label,
        nurses: (row.nurses || []).join(', '),
        rods: (row.rods || []).join(', '),
        consultants: (row.consultants || []).join(', '),
        shos: (row.shos || []).join(', '),
      };
    }
    setForm(next);
  };

  const loadVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('sort_order')
      .order('created_at');
    setVideos((data as VideoRow[]) || []);
  };

  const saveSchedule = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      for (const { key } of SHIFTS) {
        const split = (s: string) =>
          s.split(',').map((x) => x.trim()).filter(Boolean);

        const { error } = await supabase.from('schedules').upsert({
          shift_key: key,
          label: form[key].label || SHIFTS.find((s) => s.key === key)!.defaultLabel,
          nurses: split(form[key].nurses),
          rods: split(form[key].rods),
          consultants: split(form[key].consultants),
          shos: split(form[key].shos),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      setSaveMsg('Schedule saved ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: unknown) {
      setSaveMsg('Error: ' + (err instanceof Error ? err.message : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${Date.now()}_${safeName}`;

        const { error: upErr } = await supabase.storage
          .from('ads')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'video/mp4',
          });

        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('ads').getPublicUrl(path);

        const { error: dbErr } = await supabase.from('videos').insert({
          name: file.name.replace(/\.mp4$/i, ''),
          file_path: path,
          public_url: urlData.publicUrl,
          sort_order: videos.length + i,
        });
        if (dbErr) throw dbErr;
      }
      await loadVideos();
      setUploadProgress('Upload complete ✓');
      setTimeout(() => setUploadProgress(''), 2500);
    } catch (err: unknown) {
      setUploadProgress('Error: ' + (err instanceof Error ? err.message : 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (video: VideoRow) => {
    if (!confirm(`Delete "${video.name}"?`)) return;
    try {
      await supabase.storage.from('ads').remove([video.file_path]);
      await supabase.from('videos').delete().eq('id', video.id);
      await loadVideos();
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'unknown'));
    }
  };

  /** Move video up/down in playlist order */
  const moveVideo = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;

    const next = [...videos];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setVideos(next);

    try {
      await Promise.all(
        next.map((v, i) =>
          supabase.from('videos').update({ sort_order: i }).eq('id', v.id)
        )
      );
    } catch (err) {
      alert('Reorder failed: ' + (err instanceof Error ? err.message : 'unknown'));
      await loadVideos();
    }
  };

  // —— Login screen ——
  if (!authed) {
    return (
      <div className="admin-login">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">
            <img src="/logo.svg" alt="Logo" />
          </div>
          <h1>Admin Panel</h1>
          <p className="login-sub">Global Care Canlubang – ER Duty Board</p>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {loginError && <div className="login-error">{loginError}</div>}
          <button type="submit">Sign in</button>
          <a href="/" className="back-link">← Back to display</a>
        </form>
      </div>
    );
  }

  // —— Admin dashboard ——
  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-left">
          <img src="/logo.svg" alt="" className="admin-logo" />
          <div>
            <h1>Admin Panel</h1>
            <span>Global Care Canlubang</span>
          </div>
        </div>
        <div className="admin-header-right">
          <a href="/" className="btn-ghost" target="_blank" rel="noreferrer">
            Open Display ↗
          </a>
          <button className="btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={tab === 'schedule' ? 'active' : ''}
          onClick={() => setTab('schedule')}
        >
          📋 Duty Schedule
        </button>
        <button
          className={tab === 'videos' ? 'active' : ''}
          onClick={() => setTab('videos')}
        >
          🎬 Videos ({videos.length})
        </button>
      </nav>

      {!isSupabaseConfigured && (
        <div className="config-warning">
          <strong>Supabase not connected.</strong> Open <code>.env</code> in the project root,
          paste your real <code>VITE_SUPABASE_ANON_KEY</code>, save, then restart <code>npm run dev</code>.
          Current URL: {SUPABASE_URL || '(empty)'}
        </div>
      )}

      <main className="admin-main">
        {tab === 'schedule' && (
          <section className="admin-section">
            <div className="section-head">
              <h2>Weekly Duty Schedule</h2>
              <p>Edit all 4 roles, then Save. TV updates live (no restart).</p>
            </div>

            {SHIFTS.map(({ key, defaultLabel }) => (
              <div key={key} className="shift-block">
                <div className="shift-block-title">{form[key].label || defaultLabel}</div>
                <div className="field">
                  <label>Label</label>
                  <input
                    value={form[key].label}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: { ...f[key], label: e.target.value },
                      }))
                    }
                    placeholder={defaultLabel}
                  />
                </div>
                <div className="field">
                  <label>Nurses (comma separated)</label>
                  <textarea
                    rows={2}
                    value={form[key].nurses}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: { ...f[key], nurses: e.target.value },
                      }))
                    }
                    placeholder="Sarah M. RN, Lisa T. RN"
                  />
                </div>
                <div className="field">
                  <label>ROD – Resident on Duty (comma separated)</label>
                  <textarea
                    rows={2}
                    value={form[key].rods}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: { ...f[key], rods: e.target.value },
                      }))
                    }
                    placeholder="Dr. James K., Dr. Emily R."
                  />
                </div>
                <div className="field">
                  <label>Consultant on Deck (comma separated)</label>
                  <textarea
                    rows={2}
                    value={form[key].consultants}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: { ...f[key], consultants: e.target.value },
                      }))
                    }
                    placeholder="Dr. Consultant A."
                  />
                </div>
                <div className="field">
                  <label>Senior House Officer – SHO (comma separated)</label>
                  <textarea
                    rows={2}
                    value={form[key].shos}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: { ...f[key], shos: e.target.value },
                      }))
                    }
                    placeholder="Dr. SHO A."
                  />
                </div>
              </div>
            ))}

            <div className="save-bar">
              <button className="btn-primary" onClick={saveSchedule} disabled={saving}>
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
              {saveMsg && <span className="save-msg">{saveMsg}</span>}
            </div>
          </section>
        )}

        {tab === 'videos' && (
          <section className="admin-section videos-section">
            <div className="section-head">
              <h2>Video Ads</h2>
              <p>
                Upload MP4 (H.264). Use ↑ ↓ to set play order (sunod-sunod). List scrolls if many videos.
              </p>
            </div>

            <div className="upload-box">
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/*"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                id="video-upload"
              />
              <label htmlFor="video-upload" className={uploading ? 'disabled' : ''}>
                {uploading ? 'Uploading…' : '＋ Upload Videos'}
              </label>
              {uploadProgress && <div className="upload-status">{uploadProgress}</div>}
            </div>

            <div className="video-list-scroll">
              <div className="video-list">
                {videos.length === 0 && (
                  <div className="empty-state">No videos yet. Upload some MP4 files above.</div>
                )}
                {videos.map((v, i) => (
                  <div key={v.id} className="video-row">
                    <span className="video-order">{i + 1}</span>
                    <div className="video-row-info">
                      <span className="video-name">{v.name}</span>
                      <span className="video-meta">#{i + 1} in playlist</span>
                    </div>
                    <div className="video-row-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Move up"
                        disabled={i === 0}
                        onClick={() => moveVideo(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Move down"
                        disabled={i === videos.length - 1}
                        onClick={() => moveVideo(i, 1)}
                      >
                        ↓
                      </button>
                      <a
                        href={v.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-link"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleDelete(v)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
