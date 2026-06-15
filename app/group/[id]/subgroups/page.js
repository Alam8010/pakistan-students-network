'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function Subgroups() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,     setUser]     = useState(null);
  const [group,    setGroup]    = useState(null);
  const [subs,     setSubs]     = useState([]);
  const [mySubIds, setMySubIds] = useState([]);
  const [myReqs,   setMyReqs]   = useState([]);
  const [isOwner,  setIsOwner]  = useState(false);
  const [access,   setAccess]   = useState(false);
  const [newSub,   setNewSub]   = useState({ name: '', policy: 'open' });
  const [msg,      setMsg]      = useState('');
  const [loading,  setLoading]  = useState(true);
  const [busy,     setBusy]     = useState({});

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const load = async uid => {
    const { data: g } = await supabase.from('groups').select('id, group_name, owner_id').eq('id', id).single();
    setGroup(g);
    const owner = g?.owner_id === uid;
    setIsOwner(owner);
    const { data: mem } = await supabase.from('group_members').select('id').eq('group_id', id).eq('user_id', uid).maybeSingle();
    setAccess(owner || !!mem);
    const { data: s } = await supabase.from('groups').select('id, group_name, description, status, join_policy').eq('parent_group_id', id).order('created_at');
    setSubs(s || []);
    if (s && s.length > 0) {
      const subIds = s.map(x => x.id);
      const { data: myMems } = await supabase.from('group_members').select('group_id').eq('user_id', uid).in('group_id', subIds);
      setMySubIds(myMems?.map(m => m.group_id) || []);
      const { data: reqs } = await supabase.from('join_requests').select('group_id').eq('user_id', uid).eq('status', 'pending').in('group_id', subIds);
      setMyReqs(reqs?.map(r => r.group_id) || []);
    }
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

  const createSub = async e => {
    e.preventDefault();
    if (!newSub.name.trim()) return;
    const { error } = await supabase.from('groups').insert({
      owner_id: user.id, group_name: newSub.name, parent_group_id: id, status: 'active', join_policy: newSub.policy,
    });
    if (error) show('Error: ' + error.message);
    else { show('Subgroup created!'); setNewSub({ name: '', policy: 'open' }); await load(user.id); }
  };

  const joinSub = async sub => {
    setBusy(prev => ({ ...prev, [sub.id]: true }));
    if (sub.join_policy === 'open') {
      const { error } = await supabase
        .from('group_members').insert({ group_id: sub.id, user_id: user.id });
      if (error && error.code !== '23505') {
        show('Error: ' + error.message);
        setBusy(prev => ({ ...prev, [sub.id]: false }));
        return;
      }
      show('Joined!');
    } else {
      const { error } = await supabase
        .from('join_requests').insert({ group_id: sub.id, user_id: user.id });
      if (error && error.code !== '23505') {
        show('Error: ' + error.message);
        setBusy(prev => ({ ...prev, [sub.id]: false }));
        return;
      }
      show('Request sent!');
    }
    await load(user.id);
    setBusy(prev => ({ ...prev, [sub.id]: false }));
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!access) return (
    <div>
      <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
      <div className="container">
        <p>Join the parent group to view subgroups.</p>
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
        <h1 className="pt">Subgroups - {group?.group_name}</h1>
        <div className="tabs">
          <Link href={`/group/${id}`}><button className="btn-secondary">Home</button></Link>
          <Link href={`/group/${id}/chat`}><button className="btn-secondary">Chat</button></Link>
          <Link href={`/group/${id}/announcements`}><button className="btn-secondary">Announcements</button></Link>
          <Link href={`/group/${id}/materials`}><button className="btn-secondary">Materials</button></Link>
        </div>
        {msg && <p className="success">{msg}</p>}
        {isOwner && (
          <div className="card" style={{ marginBottom: 20 }}>
            <strong>Create Subgroup</strong>
            <form onSubmit={createSub}>
              <label>Name</label>
              <input value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} placeholder="Subgroup name" />
              <label>Join Policy</label>
              <select value={newSub.policy} onChange={e => setNewSub({ ...newSub, policy: e.target.value })}>
                <option value="open">Open</option>
                <option value="approval">Approval Required</option>
              </select>
              <button type="submit" style={{ marginTop: 10 }}>Create</button>
            </form>
          </div>
        )}
        {subs.length === 0 ? <p style={{ color: '#888' }}>No subgroups yet.</p> : (
          <div className="grid">
            {subs.map(s => (
              <div className="card" key={s.id}>
                <strong>{s.group_name}</strong>
                <p style={{ fontSize: 13, color: '#555', margin: '6px 0 12px' }}>{s.description || 'No description'}</p>
                <div className="row">
                  <Link href={`/group/${s.id}`}><button className="btn-sm btn-secondary">View</button></Link>
                  {!mySubIds.includes(s.id) && !isOwner && (
                    myReqs.includes(s.id)
                      ? <span style={{ fontSize: 12, color: '#d68910' }}>Pending...</span>
                      : <button className="btn-sm" onClick={() => joinSub(s)} disabled={busy[s.id]}>
                          {s.join_policy === 'open' ? 'Join' : 'Request'}
                        </button>
                  )}
                  {mySubIds.includes(s.id) && <span className="badge">Joined</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
