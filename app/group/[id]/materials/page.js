'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function Materials() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,      setUser]     = useState(null);
  const [group,     setGroup]    = useState(null);
  const [mats,      setMats]     = useState([]);
  const [isOwner,   setIsOwner]  = useState(false);
  const [access,    setAccess]   = useState(false);
  const [title,     setTitle]    = useState('');
  const [file,      setFile]     = useState(null);
  const [uploading, setUploading]= useState(false);
  const [err,       setErr]      = useState('');
  const [msg,       setMsg]      = useState('');
  const [loading,   setLoading]  = useState(true);

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async uid => {
    const { data: g } = await supabase.from('groups').select('id, group_name, owner_id').eq('id', id).single();
    setGroup(g);
    const owner = g?.owner_id === uid;
    setIsOwner(owner);
    const { data: mem } = await supabase.from('group_members').select('id').eq('group_id', id).eq('user_id', uid).maybeSingle();
    setAccess(owner || !!mem);
    const { data: m } = await supabase.from('materials')
      .select('id, title, file_url, file_type, created_at, profiles(full_name, email)')
      .eq('group_id', id).order('created_at', { ascending: false });
    setMats(m || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/student/login');
      setUser(session.user);
      await load(session.user.id);
    })();
  }, [id]);

  const upload = async e => {
    e.preventDefault();
    setErr('');
    if (!title || !file) return setErr('Title and file required.');
    const cloud  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) return setErr('Cloudinary not configured.');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', preset);
    fd.append('folder', 'psn/group_' + id);
    const res = await fetch('https://api.cloudinary.com/v1_1/' + cloud + '/auto/upload', { method: 'POST', body: fd });
    const cld = await res.json();
    if (!cld.secure_url) { setUploading(false); return setErr('Upload failed: ' + (cld.error?.message || 'Unknown')); }
    const { error } = await supabase.from('materials').insert({
      group_id: id, title, file_url: cld.secure_url, file_type: file.type, created_by: user.id,
    });
    setUploading(false);
    if (error) return setErr(error.message);
    setTitle(''); setFile(null);
    show('Material uploaded!');
    await load(user.id);
  };

  const del = async matId => {
    if (!confirm('Delete?')) return;
    await supabase.from('materials').delete().eq('id', matId);
    setMats(mats.filter(m => m.id !== matId));
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!access) return (
    <div>
      <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
      <div className="container">
        <p>Join this group to view materials.</p>
        <Link href={`/group/${id}`}><button style={{ marginTop: 12 }}>Back</button></Link>
      </div>
    </div>
  );

  return (
    <div>
      <nav>
        <Link href="/" className="brand">Pakistan Students Network</Link>
        <Link href={`/group/${id}`} style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Back</Link>
      </nav>
      <div className="container">
        <h1 className="pt">Materials - {group?.group_name}</h1>
        <div className="tabs">
          <Link href={`/group/${id}`}><button className="btn-secondary">Home</button></Link>
          <Link href={`/group/${id}/chat`}><button className="btn-secondary">Chat</button></Link>
          <Link href={`/group/${id}/announcements`}><button className="btn-secondary">Announcements</button></Link>
          <Link href={`/group/${id}/subgroups`}><button className="btn-secondary">Subgroups</button></Link>
        </div>
        {isOwner && (
          <div className="card" style={{ marginBottom: 20 }}>
            <strong>Upload Material</strong>
            <form onSubmit={upload}>
              <label>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Material title" />
              <label>File</label>
              <input type="file" onChange={e => setFile(e.target.files[0])} style={{ border: 'none', padding: 0 }} />
              {err && <p className="error">{err}</p>}
              {msg && <p className="success">{msg}</p>}
              <button type="submit" style={{ marginTop: 10 }} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
            </form>
          </div>
        )}
        {mats.length === 0 ? <p style={{ color: '#888' }}>No materials yet.</p> : mats.map(m => (
          <div className="mat-row" key={m.id}>
            <div>
              <a href={m.file_url} target="_blank" rel="noopener noreferrer">{m.title}</a>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{m.profiles?.full_name || m.profiles?.email} · {new Date(m.created_at).toLocaleDateString()}</div>
            </div>
            <div className="row">
              <a href={m.file_url} target="_blank" rel="noopener noreferrer"><button className="btn-sm btn-secondary">Download</button></a>
              {isOwner && <button className="btn-sm btn-danger" onClick={() => del(m.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
