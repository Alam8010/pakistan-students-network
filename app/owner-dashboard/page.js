'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OwnerDashboard() {
  const router   = useRouter();
  const supabase = createClient();
  const [user,    setUser]    = useState(null);
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/group-owner/login');
      setUser(session.user);
      const { data } = await supabase
        .from('groups')
        .select('id, group_name, description, status, join_policy, created_at')
        .eq('owner_id', session.user.id)
        .is('parent_group_id', null)
        .order('created_at', { ascending: false });
      setGroups(data || []);
      setLoading(false);
    })();
  }, []);

  const logout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="container"><p>Loading...</p></div>;

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
        <h1 className="pt">Group Owner Dashboard</h1>
        {groups.length === 0 ? (
          <div className="card"><p>No groups found.</p></div>
        ) : (
          groups.map(g => (
            <div className="card" key={g.id}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{g.group_name}</strong>{' '}
                  <span className={`badge${g.status === 'pending' ? ' badge-pending' : g.status === 'inactive' ? ' badge-inactive' : ''}`}>
                    {g.status}
                  </span>
                </div>
              </div>
              <p style={{ color: '#555', fontSize: 13, marginBottom: 14 }}>{g.description || 'No description'}</p>
              {g.status === 'pending' && (
                <p style={{ color: '#d68910', fontSize: 13, marginBottom: 12, fontWeight: 'bold' }}>
                  Awaiting admin approval before going live.
                </p>
              )}
              <div className="row">
                <Link href={`/group/${g.id}`}><button className="btn-sm">Group Page</button></Link>
                <Link href={`/group/${g.id}/manage`}><button className="btn-sm btn-secondary">Manage</button></Link>
                <Link href={`/group/${g.id}/announcements`}><button className="btn-sm btn-secondary">Announcements</button></Link>
                <Link href={`/group/${g.id}/materials`}><button className="btn-sm btn-secondary">Materials</button></Link>
                <Link href={`/group/${g.id}/subgroups`}><button className="btn-sm btn-secondary">Subgroups</button></Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
