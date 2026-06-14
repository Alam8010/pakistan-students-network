import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(req, { params }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: g } = await supabase.from('groups').select('owner_id').eq('id', params.id).single();
  if (!g || g.owner_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error } = await supabase.from('group_members').delete().eq('group_id', params.id).eq('user_id', params.memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
