'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StudentLogin() {
  const supabase = createClient();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  const h = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) { setErr(error.message); setBusy(false); return; }
      if (!data?.user) { setErr('Login failed. Please try again.'); setBusy(false); return; }

      // Admin shortcut
      if (form.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        window.location.href = '/admin';
        return;
      }

      // Get role from profile
      const { data: prof } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).single();

      const role = prof?.role || 'student';
      // Use window.location.href (hard redirect) so middleware sees the new session cookies
      window.location.href = role === 'group_owner' ? '/owner-dashboard' : '/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      setErr('An unexpected error occurred. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div>
      <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
      <div className="form-box">
        <h2>Student Login</h2>
        <form onSubmit={submit}>
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={h} placeholder="you@example.com" />
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={h} />
          {err && <p className="error">{err}</p>}
          <button type="submit" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
            {busy ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: 13 }}>
          New? <Link href="/student/signup" style={{ color: '#1a5276' }}>Sign up</Link>
        </p>
        <p style={{ fontSize: 13 }}>
          Group owner? <Link href="/group-owner/login" style={{ color: '#1e8449' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
