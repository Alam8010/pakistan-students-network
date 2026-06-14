import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(n)       { return req.cookies.get(n)?.value; },
        set(n, v, o) { res.cookies.set({ name: n, value: v, ...o }); },
        remove(n, o) { res.cookies.set({ name: n, value: '', ...o }); },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  const path = req.nextUrl.pathname;

  const needsAuth = ['/dashboard', '/owner-dashboard', '/group', '/admin']
    .some(p => path.startsWith(p));

  if (needsAuth && !session) {
    const url = new URL('/student/login', req.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (path.startsWith('/admin') && session) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/owner-dashboard/:path*', '/group/:path*', '/admin/:path*'],
};
