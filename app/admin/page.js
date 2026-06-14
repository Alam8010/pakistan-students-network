'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Admin() {
  const router   = useRouter();
  const supabase = createClient();
  const [tab,     setTab]    = useState('groups');
  const [groups,  setGroups] = useState([]);
  const [users,   setUsers]  = useState([]);
  const [loading, setLoading]= useState(true);
  const [msg,     setMsg]    = useState('');

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async () => {
    const [gr, us] = await Promise.all([
      fetch('/api/admin/data?type=groups').then(r => r.json()),
      fetch('/api/admin/data?type=users').then(r => r.json()),
    ]);
    setGroups(gr.data || []);
    setUsers(us.data || []);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/student/login');
      if (session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return router.push('/');
      await load();
      setLoading(false);
    })();
  }, []);

  const groupAction = async (gId, action, body) => {
    const r = await fetch('/api/admin/groups/' + gId, {
      method: action === 'delete' ? 'DELETE' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: action !== 'delete' ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (d.error) show('Error: ' + d.error);
    else { show(d.message || 'Done'); await load(); }
  };

  const userAction = async (uid, action, body) => {
    const r = await fetch('/api/admin/users/' + uid, {
      method: action === 'delete' ? 'DELETE' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: action !== 'delete' ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (d.error) show('Error: ' + d.error);
    else { show(d.message || 'Done'); await load(); }
  };

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  const topGroups = groups.filter(g => !g.parent_group_id);
  const pending   = topGroups.filter(g => g.status === 'pending');

  return (
    <div>
      <nav>
        <Link href="/" className="brand">PSN Admin</Link>
        <button className="btn-secondary btn-sm nav-btn" onClick={logout}>Logout</button>
      </nav>
      <div className="container">
        <h1 className="pt">Admin Dashboard</h1>
        {msg && <p className="success">{msg}</p>}
        <div className="stats">
          <div className="stat-card"><div className="num">{pending.length}</div><div className="lbl">Pending Groups</div></div>
          <div className="stat-card"><div className="num">{topGroups.filter(g => g.status === 'active').length}</div><div className="lbl">Active Groups</div></div>
          <div className="stat-card"><div className="num">{users.length}</div><div className="lbl">Total Users</div></div>
          <div className="stat-card"><div className="num">{users.filter(u => u.role === 'student').length}</div><div className="lbl">Students</div></div>
          <div className="stat-card"><div className="num">{users.filter(u => u.role === 'group_owner').length}</div><div className="lbl">Group Owners</div></div>
        </div>
        <div className="tabs" style={{ marginBottom: 18 }}>
          <button onClick={() => setTab('groups')} style={{ background: tab === 'groups' ? '#1a5276' : '#ddd', color: tab === 'groups' ? '#fff' : '#333' }}>Groups ({groups.length})</button>
          <button onClick={() => setTab('users')} style={{ background: tab === 'users' ? '#1a5276' : '#ddd', color: tab === 'users' ? '#fff' : '#333' }}>Users ({users.length})</button>
        </div>
        {tab === 'groups' && groups.map(g => (
          <div className="card" key={g.id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{g.group_name}</strong>{' '}
                {g.parent_group_id && <span style={{ fontSize: 11, color: '#888' }}>(subgroup)</span>}{' '}
                <span className={`badge${g.status === 'pending' ? ' badge-pending' : g.status === 'inactive' ? ' badge-inactive' : ''}`}>{g.status}</span>
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Owner: {g.profiles?.full_name || g.profiles?.email}</div>
              </div>
              <div className="row">
                <Link href={`/group/${g.id}`}><button className="btn-sm btn-secondary">View</button></Link>
                {g.status === 'pending' && <button className="btn-sm btn-green" onClick={() => groupAction(g.id, 'update', { status: 'active' })}>Approve</button>}
                {g.status === 'pending' && <button className="btn-sm btn-danger" onClick={() => groupAction(g.id, 'update', { status: 'inactive' })}>Reject</button>}
                {g.status === 'active' && <button className="btn-sm btn-secondary" onClick={() => groupAction(g.id, 'update', { status: 'inactive' })}>Deactivate</button>}
                {g.status === 'inactive' && <button className="btn-sm btn-green" onClick={() => groupAction(g.id, 'update', { status: 'active' })}>Activate</button>}
                <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete?')) groupAction(g.id, 'delete'); }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {tab === 'users' && users.map(u => (
          <div className="card" key={u.id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{u.full_name || 'No name'}</strong> <span className="badge">{u.role}</span>
                <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{u.email}</div>
              </div>
              <div className="row">
                <select defaultValue={u.role} onChange={e => userAction(u.id, 'update', { role: e.target.value })}
                  style={{ padding: '5px 8px', fontSize: 13, width: 'auto', margin: 0 }}>
                  <option value="student">student</option>
                  <option value="group_owner">group_owner</option>
                  <option value="admin">admin</option>
                </select>
                {u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                  <button className="btn-sm btn-danger" onClick={() => { if (confirm('Delete ' + u.email + '?')) userAction(u.id, 'delete'); }}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
