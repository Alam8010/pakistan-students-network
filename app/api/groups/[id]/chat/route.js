import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase.from('chat_messages')
    .select('id, message, created_at, user_id, profiles(full_name, email)')
    .eq('group_id', params.id).order('created_at', { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
