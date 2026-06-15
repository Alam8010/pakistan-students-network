'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function GroupPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,      setUser]    = useState(null);
  const [group,     setGroup]   = useState(null);
  const [isMember,  setIsMem]   = useState(false);
  const [isOwner,   setIsOwner] = useState(false);
  const [requested, setReq]     = useState(false);
  const [loading,   setLoading] = useState(true);
  const [busy,      setBusy]    = useState(false);
  const [msg,       setMsg]     = useState('');
  const [errMsg,    setErrMsg]  = useState('');

  const show    = m => { setMsg(m);    setTimeout(() => setMsg(''),    3500); };
const showErr = m => { setErrMsg(m); setTimeout(() => setErrMsg(''), 3500); };

  const load = async uid => {
    const { data: g } = await supabase
      .from('groups')
      .select('*, profiles(full_name, email)')
      .eq('id', id).single();
    setGroup(g);
    if (!g) return;
    const owner = g.owner_id === uid;
    setIsOwner(owner);
    if (!owner) {
      const { data: mem } = await supabase
        .from('group_members').select('id').eq('group_id', id).eq('user_id', uid).maybeSingle();
      setIsMem(!!mem);
      if (!mem) {
        const { data: req } = await supabase
          .from('join_requests').select('id')
          .eq('group_id', id).eq('user_id', uid).eq('status', 'pending').maybeSingle();
        setReq(!!req);
      }
    } else {
      setIsMem(true);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/student/login');
      setUser(session.user);
      await load(session.user.id);
      setLoading(false);
    })();
  }, [id]);

  const join = async () => {
    setBusy(true);
    if (group.join_policy === 'open') {
      const { error } = await supabase
        .from('group_members').insert({ group_id: id, user_id: user.id });
      if (error) {
        if (error.code === '23505') {
          setIsMem(true);
          show('You are already a member of this group.');
        } else {
          showErr(error.message);
        }
      } else {
        show('You joined this group!');
        setIsMem(true);
      }
    } else {
      const { error } = await supabase
        .from('join_requests').insert({ group_id: id, user_id: user.id });
      if (error) {
        if (error.code === '23505') {
          setReq(true);
          show('You already have a pending request.');
        } else {
          showErr(error.message);
        }
      } else {
        show('Join request sent!');
        setReq(true);
      }
    }
    setBusy(false);
  };

  const leave = async () => {
    if (!confirm('Leave this group?')) return;
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', user.id);
    show('You left the group.');
    setIsMem(false);
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (!group)  return <div className="container"><p>Group not found.</p></div>;

  const canAccess = (isMember || isOwner) && group.status === 'active';

  return (
    <div>
      <nav>
        <Link href="/" className="brand">Pakistan Students Network</Link>
        <Link href={isOwner ? '/owner-dashboard' : '/dashboard'}
          style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Dashboard</Link>
      </nav>
      <div className="container">
        {group.parent_group_id && (
          <p style={{ fontSize: 13, marginBottom: 10 }}>
            <Link href={`/group/${group.parent_group_id}`} style={{ color: '#1a5276' }}>
              Back to parent group
            </Link>
          </p>
        )}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 24, marginBottom: 6 }}>{group.group_name}</h1>
              <p style={{ color: '#555', marginBottom: 6 }}>{group.description || 'No description'}</p>
              <p style={{ fontSize: 13, color: '#888' }}>
                Owner: {group.profiles?.full_name || group.profiles?.email}{' '}
                Status: <span className={`badge${group.status === 'pending' ? ' badge-pending' : group.status === 'inactive' ? ' badge-inactive' : ''}`}>{group.status}</span>
              </p>
            </div>
            <div>
              {isOwner && <span className="badge">You are the owner</span>}
              {!isOwner && !isMember && !requested && group.status === 'active' && (
                <button onClick={join} disabled={busy}>
                  {busy ? '...' : group.join_policy === 'open' ? 'Join Group' : 'Request to Join'}
                </button>
              )}
              {!isOwner && !isMember && requested && (
                <span className="badge badge-pending">Request Pending</span>
              )}
              {!isOwner && isMember && (
                <button className="btn-secondary btn-sm" onClick={leave}>Leave Group</button>
              )}
            </div>
          </div>
        </div>
        {msg    && <p className="success">{msg}</p>}
        {errMsg && <p className="error">{errMsg}</p>}
        {canAccess && (
          <div className="tabs">
            <Link href={`/group/${id}/chat`}><button>Chat</button></Link>
            <Link href={`/group/${id}/announcements`}><button>Announcements</button></Link>
            <Link href={`/group/${id}/materials`}><button>Materials</button></Link>
            <Link href={`/group/${id}/subgroups`}><button>Subgroups</button></Link>
            {isOwner && (
              <Link href={`/group/${id}/manage`}><button style={{ background: '#1e8449' }}>Manage</button></Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
