import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

async function isAdmin(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL ? session : null;
}

export async function PUT(req, { params }) {
  const supabase = createClient();
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const body  = await req.json();
  const { error } = await admin.from('groups').update(body).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Group updated.' });
}

export async function DELETE(req, { params }) {
  const supabase = createClient();
  if (!await isAdmin(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin.from('groups').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Group deleted.' });
}
