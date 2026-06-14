import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: g } = await supabase.from('groups').select('owner_id').eq('id', params.id).single();
  if (!g || g.owner_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { action } = await req.json();
  const { data: jreq } = await supabase.from('join_requests').select('user_id').eq('id', params.reqId).single();
  if (action === 'approve') {
    await supabase.from('group_members').insert({ group_id: params.id, user_id: jreq.user_id });
    await supabase.from('join_requests').update({ status: 'approved' }).eq('id', params.reqId);
    return NextResponse.json({ approved: true });
  }
  await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', params.reqId);
  return NextResponse.json({ rejected: true });
}
