'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentDashboard() {
  const router   = useRouter();
  const supabase = createClient();
  const [user,      setUser]      = useState(null);
  const [myGroups,  setMyGroups]  = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [myReqs,    setMyReqs]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState({});
  const [msg,       setMsg]       = useState('');

  const show = m => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const load = async uid => {
    const { data: mems } = await supabase
      .from('group_members')
      .select('group_id, groups(id, group_name, description, parent_group_id)')
      .eq('user_id', uid);
    setMyGroups(mems?.map(m => m.groups).filter(g => g && !g.parent_group_id) || []);

    const { data: all } = await supabase
      .from('groups')
      .select('id, group_name, description, join_policy')
      .eq('status', 'active')
      .is('parent_group_id', null);
    setAllGroups(all || []);

    const { data: reqs } = await supabase
      .from('join_requests')
      .select('group_id')
      .eq('user_id', uid)
      .eq('status', 'pending');
    setMyReqs(reqs?.map(r => r.group_id) || []);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/student/login');
      setUser(session.user);
      await load(session.user.id);
      setLoading(false);
    })();
  }, []);

  const join = async g => {
    if (!user) return;
    setBusy({ ...busy, [g.id]: true });
    if (g.join_policy === 'open') {
      const { error } = await supabase
        .from('group_members').insert({ group_id: g.id, user_id: user.id });
      if (error) show('Error: ' + error.message);
      else show('Joined "' + g.group_name + '"!');
    } else {
      const { error } = await supabase
        .from('join_requests').insert({ group_id: g.id, user_id: user.id });
      if (error) show('Error: ' + error.message);
      else show('Join request sent for "' + g.group_name + '"!');
    }
    await load(user.id);
    setBusy({ ...busy, [g.id]: false });
  };

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  const myIds    = myGroups.map(g => g.id);
  const discover = allGroups.filter(g => !myIds.includes(g.id));

  return (
    <div>
      <nav>
        <Link href="/" className="brand">Pakistan Students Network</Link>
        <div>
          <span style={{ fontSize: 13, color: '#fff', marginRight: 12 }}>{user?.email}</span>
          <button className="btn-secondary btn-sm nav-btn" onClick={logout}>Logout</button>
        </div>
      </nav>
      <div className="container">
        <h1 className="pt">Student Dashboard</h1>
        {msg && <p className="success">{msg}</p>}

        <h2 className="st">My Groups</h2>
        {myGroups.length === 0 ? (
          <p style={{ color: '#888' }}>You have not joined any groups yet.</p>
        ) : (
          <div className="grid">
            {myGroups.map(g => (
              <div className="card" key={g.id}>
                <strong style={{ fontSize: 15 }}>{g.group_name}</strong>
                <p style={{ color: '#555', fontSize: 13, margin: '6px 0 12px' }}>{g.description || 'No description'}</p>
                <Link href={`/group/${g.id}`}><button className="btn-sm">Open Group</button></Link>
              </div>
            ))}
          </div>
        )}

        <h2 className="st">Discover Groups</h2>
        {discover.length === 0 ? (
          <p style={{ color: '#888' }}>You have joined all available groups!</p>
        ) : (
          <div className="grid">
            {discover.map(g => (
              <div className="card" key={g.id}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 15 }}>{g.group_name}</strong>
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, fontWeight: 'bold',
                    background: g.join_policy === 'open' ? '#d5f5e3' : '#fef9e7',
                    color: g.join_policy === 'open' ? '#1e8449' : '#d68910' }}>
                    {g.join_policy === 'open' ? 'Open' : 'Approval'}
                  </span>
                </div>
                <p style={{ color: '#555', fontSize: 13, margin: '0 0 12px' }}>{g.description || 'No description'}</p>
                <div className="row">
                  <Link href={`/group/${g.id}`}><button className="btn-sm btn-secondary">View</button></Link>
                  {myReqs.includes(g.id) ? (
                    <span style={{ fontSize: 12, color: '#d68910' }}>Request pending...</span>
                  ) : (
                    <button className="btn-sm" onClick={() => join(g)} disabled={busy[g.id]}>
                      {busy[g.id] ? '...' : g.join_policy === 'open' ? 'Join' : 'Request to Join'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
