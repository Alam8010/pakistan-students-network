import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: g } = await supabase.from('groups').select('join_policy, status').eq('id', params.id).single();
  if (!g || g.status !== 'active') return NextResponse.json({ error: 'Group not available.' }, { status: 400 });
  if (g.join_policy === 'open') {
    const { error } = await supabase.from('group_members').insert({ group_id: params.id, user_id: session.user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ joined: true });
  } else {
    const { error } = await supabase.from('join_requests').insert({ group_id: params.id, user_id: session.user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requested: true });
  }
}
