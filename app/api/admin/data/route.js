import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

async function isAdmin(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? session : null;
}

export async function GET(req) {
  const supabase = createClient();
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const type  = new URL(req.url).searchParams.get('type');
  if (type === 'groups') {
    const { data, error } = await admin.from('groups')
      .select('id, group_name, description, status, join_policy, parent_group_id, owner_id, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }
  if (type === 'users') {
    const { data, error } = await admin.from('profiles')
      .select('id, email, full_name, role, created_at').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
