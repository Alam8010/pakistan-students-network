'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function GroupChat() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();
  const [user,   setUser]   = useState(null);
  const [group,  setGroup]  = useState(null);
  const [msgs,   setMsgs]   = useState([]);
  const [txt,    setTxt]    = useState('');
  const [access, setAccess] = useState(false);
  const [busy,   setBusy]   = useState(false);
  const bottom              = useRef(null);

  useEffect(() => {
    let ch;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/student/login');
      setUser(session.user);
      const uid = session.user.id;
      const { data: g } = await supabase
        .from('groups').select('id, group_name, owner_id').eq('id', id).single();
      setGroup(g);
      const isOwner = g?.owner_id === uid;
      const { data: mem } = await supabase
        .from('group_members').select('id').eq('group_id', id).eq('user_id', uid).maybeSingle();
      const ok = isOwner || !!mem;
      setAccess(ok);
      if (!ok) return;
      const { data: m } = await supabase
        .from('chat_messages')
        .select('id, message, created_at, user_id, profiles(full_name, email)')
        .eq('group_id', id).order('created_at', { ascending: true }).limit(200);
      setMsgs(m || []);
      ch = supabase.channel('chat:' + id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'group_id=eq.' + id },
          async payload => {
            const { data: nm } = await supabase
              .from('chat_messages')
              .select('id, message, created_at, user_id, profiles(full_name, email)')
              .eq('id', payload.new.id).single();
            if (nm) setMsgs(prev => [...prev, nm]);
          }).subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async e => {
    e.preventDefault();
    if (!txt.trim()) return;
    setBusy(true);
    await supabase.from('chat_messages').insert({ group_id: id, user_id: user.id, message: txt.trim() });
    setTxt('');
    setBusy(false);
  };

  if (!access) return (
    <div>
      <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
      <div className="container">
        <p>You must be a member to use chat.</p>
        <Link href={`/group/${id}`}><button style={{ marginTop: 12 }}>Back to Group</button></Link>
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
        <h1 className="pt">Chat - {group?.group_name}</h1>
        <div className="tabs">
          <Link href={`/group/${id}`}><button className="btn-secondary">Home</button></Link>
          <Link href={`/group/${id}/announcements`}><button className="btn-secondary">Announcements</button></Link>
          <Link href={`/group/${id}/materials`}><button className="btn-secondary">Materials</button></Link>
          <Link href={`/group/${id}/subgroups`}><button className="btn-secondary">Subgroups</button></Link>
        </div>
        <div className="chat-wrap">
          <div className="chat-msgs">
            {msgs.map(m => (
              <div className={m.user_id === user?.id ? 'msg mine' : 'msg'} key={m.id}>
                <div className="sender">{m.profiles?.full_name || m.profiles?.email}</div>
                <div className="text">{m.message}</div>
                <div className="time">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
            {msgs.length === 0 && <p style={{ color: '#aaa', textAlign: 'center', marginTop: 20 }}>No messages yet.</p>}
            <div ref={bottom} />
          </div>
          <form className="chat-input" onSubmit={send}>
            <input value={txt} onChange={e => setTxt(e.target.value)} placeholder="Type a message..." disabled={busy} />
            <button type="submit" disabled={busy || !txt.trim()}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
