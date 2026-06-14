import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = createClient();
  const { data: groups } = await supabase
    .from('groups')
    .select('id, group_name, description, join_policy')
    .eq('status', 'active')
    .is('parent_group_id', null)
    .order('created_at', { ascending: false });

  return (
    <div>
      <nav>
        <span className="brand">Pakistan Students Network</span>
        <div>
          <Link href="/student/login" style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Student Login</Link>
          <Link href="/group-owner/login" style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Group Owner Login</Link>
        </div>
      </nav>

      <div className="container">
        <div style={{ textAlign: 'center', padding: '40px 0 30px' }}>
          <h1 style={{ fontSize: 32, marginBottom: 10 }}>Pakistan Students Network</h1>
          <p style={{ color: '#555', marginBottom: 28, fontSize: 16 }}>
            Join student groups, share resources, stay connected — across Pakistan
          </p>
          <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
            <Link href="/student/signup"><button style={{ fontSize: 15, padding: '11px 24px' }}>Join as Student</button></Link>
            <Link href="/student/login"><button className="btn-secondary" style={{ fontSize: 15, padding: '11px 24px' }}>Student Login</button></Link>
            <Link href="/group-owner/register"><button style={{ fontSize: 15, padding: '11px 24px', background: '#1e8449' }}>Register Your Group</button></Link>
            <Link href="/group-owner/login"><button className="btn-secondary" style={{ fontSize: 15, padding: '11px 24px' }}>Group Owner Login</button></Link>
          </div>
        </div>

        <h2 className="st">Active Groups</h2>
        {groups && groups.length > 0 ? (
          <div className="grid">
            {groups.map(g => (
              <div className="card" key={g.id}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: 15 }}>{g.group_name}</strong>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 'bold',
                    background: g.join_policy === 'open' ? '#d5f5e3' : '#fef9e7',
                    color: g.join_policy === 'open' ? '#1e8449' : '#d68910' }}>
                    {g.join_policy === 'open' ? 'Open Join' : 'Approval Required'}
                  </span>
                </div>
                <p style={{ color: '#555', fontSize: 13, marginBottom: 12 }}>{g.description || 'No description'}</p>
                <Link href={`/group/${g.id}`}><button className="btn-sm">View Group</button></Link>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888' }}>No active groups yet. Be the first to register one!</p>
        )}
      </div>
    </div>
  );
}
