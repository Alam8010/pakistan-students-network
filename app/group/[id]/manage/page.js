'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ManageGroup() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,     setUser]     = useState(null);
  const [group,    setGroup]    = useState(null);
  const [members,  setMembers]  = useState([]);
  const [requests, setReqs]     = useState([]);
  const [settings, setSettings] = useState({ group_name: '', description: '', join_policy: 'open' });
  const [msg,      setMsg]      = useState('');
  const [loading,  setLoading]  = useState(true);

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async uid => {
    const { data: g } = await supabase.from('groups').select('*').eq('id', id).single();
    if (!g || g.owner_id !== uid) { router.push('/owner-dashboard'); return; }
    setGroup(g);
    setSettings({ group_name: g.group_name, description: g.description || '', join_policy: g.join_policy });
    const { data: mems } = await supabase.from('group_members')
      .select('id, user_id, joined_at, profiles(full_name, email)').eq('group_id', id);
    setMembers(mems || []);
    const { data: reqs } = await supabase.from('join_requests')
      .select('id, user_id, created_at, profiles(full_name, email)')
      .eq('group_id', id).eq('status', 'pending').order('created_at');
    setReqs(reqs || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/group-owner/login');
      setUser(session.user);
      await load(session.user.id);
    })();
  }, [id]);

  const removeMember = async userId => {
    if (!confirm('Remove this member?')) return;
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId);
    setMembers(members.filter(m => m.user_id !== userId));
    show('Member removed.');
  };

  const handleRequest = async (reqId, userId, action) => {
    if (action === 'approve') {
      await supabase.from('group_members').insert({ group_id: id, user_id: userId });
      await supabase.from('join_requests').update({ status: 'approved' }).eq('id', reqId);
      show('Member approved!');
    } else {
      await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', reqId);
      show('Request rejected.');
    }
    await load(user.id);
  };

  const saveSettings = async e => {
    e.preventDefault();
    const { error } = await supabase.from('groups').update({
      group_name: settings.group_name, description: settings.description, join_policy: settings.join_policy,
    }).eq('id', id);
    if (error) show('Error: ' + error.message);
    else { show('Settings saved!'); await load(user.id); }
  };

  const deleteGroup = async () => {
    if (!confirm('DELETE this group and ALL its data? Cannot be undone.')) return;
    await supabase.from('groups').delete().eq('id', id);
    router.push('/owner-dashboard');
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <div>
      <nav>
        <Link href="/" className="brand">Pakistan Students Network</Link>
        <Link href={`/group/${id}`} style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Back</Link>
      </nav>
      <div className="container">
        <h1 className="pt">Manage - {group?.group_name}</h1>
        {msg && <p className="success">{msg}</p>}

        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Pending Join Requests ({requests.length})</strong>
          {requests.length === 0 ? <p style={{ color: '#888', marginTop: 8 }}>No pending requests.</p> : (
            <ul className="mlist" style={{ marginTop: 10 }}>
              {requests.map(r => (
                <li key={r.id}>
                  <span><strong>{r.profiles?.full_name || r.profiles?.email}</strong></span>
                  <div className="row">
                    <button className="btn-sm btn-green" onClick={() => handleRequest(r.id, r.user_id, 'approve')}>Approve</button>
                    <button className="btn-sm btn-danger" onClick={() => handleRequest(r.id, r.user_id, 'reject')}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Members ({members.length})</strong>
          <ul className="mlist" style={{ marginTop: 10 }}>
            {members.map(m => (
              <li key={m.user_id}>
                <span><strong>{m.profiles?.full_name || 'Unknown'}</strong> <span style={{ fontSize: 12, color: '#888' }}>{m.profiles?.email}</span></span>
                <button className="btn-sm btn-danger" onClick={() => removeMember(m.user_id)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Group Settings</strong>
          <form onSubmit={saveSettings}>
            <label>Group Name</label>
            <input value={settings.group_name} onChange={e => setSettings({ ...settings, group_name: e.target.value })} />
            <label>Description</label>
            <textarea value={settings.description} rows={3} onChange={e => setSettings({ ...settings, description: e.target.value })} />
            <label>Join Policy</label>
            <select value={settings.join_policy} onChange={e => setSettings({ ...settings, join_policy: e.target.value })}>
              <option value="open">Open</option>
              <option value="approval">Approval Required</option>
            </select>
            <button type="submit" style={{ marginTop: 12 }}>Save Settings</button>
          </form>
        </div>

        <div className="card" style={{ borderColor: '#e74c3c' }}>
          <strong style={{ color: '#c0392b' }}>Danger Zone</strong>
          <p style={{ fontSize: 13, color: '#555', margin: '8px 0 12px' }}>Deleting this group is permanent and cannot be undone.</p>
          <button className="btn-danger" onClick={deleteGroup}>Delete This Group</button>
        </div>
      </div>
    </div>
  );
}
