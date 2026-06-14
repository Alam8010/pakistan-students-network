'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function Announcements() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,    setUser]    = useState(null);
  const [group,   setGroup]   = useState(null);
  const [anns,    setAnns]    = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [access,  setAccess]  = useState(false);
  const [form,    setForm]    = useState({ title: '', content: '' });
  const [err,     setErr]     = useState('');
  const [msg,     setMsg]     = useState('');
  const [loading, setLoading] = useState(true);

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async uid => {
    const { data: g } = await supabase.from('groups').select('id, group_name, owner_id').eq('id', id).single();
    setGroup(g);
    const owner = g?.owner_id === uid;
    setIsOwner(owner);
    const { data: mem } = await supabase.from('group_members').select('id').eq('group_id', id).eq('user_id', uid).maybeSingle();
    setAccess(owner || !!mem);
    const { data: a } = await supabase.from('announcements')
      .select('id, title, content, created_at, profiles(full_name, email)')
      .eq('group_id', id).order('created_at', { ascending: false });
    setAnns(a || []);
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

  const post = async e => {
    e.preventDefault();
    setErr('');
    if (!form.title || !form.content) return setErr('Title and content required.');
    const { error } = await supabase.from('announcements').insert({
      group_id: id, title: form.title, content: form.content, created_by: user.id,
    });
    if (error) return setErr(error.message);
    setForm({ title: '', content: '' });
    show('Announcement posted!');
    await load(user.id);
  };

  const del = async annId => {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', annId);
    setAnns(anns.filter(a => a.id !== annId));
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!access) return (
    <div>
      <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
      <div className="container">
        <p>You must be a member to view announcements.</p>
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
        <h1 className="pt">Announcements - {group?.group_name}</h1>
        <div className="tabs">
          <Link href={`/group/${id}`}><button className="btn-secondary">Home</button></Link>
          <Link href={`/group/${id}/chat`}><button className="btn-secondary">Chat</button></Link>
          <Link href={`/group/${id}/materials`}><button className="btn-secondary">Materials</button></Link>
          <Link href={`/group/${id}/subgroups`}><button className="btn-secondary">Subgroups</button></Link>
        </div>
        {isOwner && (
          <div className="card" style={{ marginBottom: 20 }}>
            <strong>Post Announcement</strong>
            <form onSubmit={post}>
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" />
              <label>Content</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Write your announcement..." />
              {err && <p className="error">{err}</p>}
              {msg && <p className="success">{msg}</p>}
              <button type="submit" style={{ marginTop: 10 }}>Post</button>
            </form>
          </div>
        )}
        {anns.length === 0 ? <p style={{ color: '#888' }}>No announcements yet.</p> : anns.map(a => (
          <div className="card" key={a.id}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <strong>{a.title}</strong>
              {isOwner && <button className="btn-danger btn-sm" onClick={() => del(a.id)}>Delete</button>}
            </div>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{a.content}</p>
            <p style={{ fontSize: 12, color: '#888' }}>{a.profiles?.full_name || a.profiles?.email} · {new Date(a.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
