import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const url    = new URL(req.url);
  const code   = url.searchParams.get('code');
  const origin = url.origin;

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Check the user's role so we redirect to the right dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'group_owner') {
        return NextResponse.redirect(`${origin}/owner-dashboard`);
      }
      if (profile?.role === 'admin') {
        return NextResponse.redirect(`${origin}/admin`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
