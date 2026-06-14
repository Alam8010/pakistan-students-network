'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function StudentSignup() {
  const supabase = createClient();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'confirm'

  const h = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (!form.fullName || !form.email || !form.password) return setErr('All fields required.');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, role: 'student' } },
      });
      setBusy(false);
      if (error) return setErr(error.message);

      if (data?.session) {
        // Email confirmation disabled — go straight in
        window.location.href = '/dashboard';
      } else {
        // Email confirmation required
        setStep('confirm');
      }
    } catch (err) {
      setBusy(false);
      setErr('An unexpected error occurred. Please try again.');
    }
  };

  if (step === 'confirm') {
    return (
      <div>
        <nav><Link href="/" className="brand">Pakistan Students Network</Link></nav>
        <div className="form-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2>Check Your Email</h2>
          <p style={{ color: '#555', margin: '12px 0 20px' }}>
            A confirmation link was sent to <strong>{form.email}</strong>.<br />
            Click it to verify your account, then log in below.
          </p>
          <Link href="/student/login">
            <button style={{ width: '100%' }}>Go to Login</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav>
        <Link href="/" className="brand">Pakistan Students Network</Link>
        <Link href="/student/login" style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Already have an account?</Link>
      </nav>
      <div className="form-box">
        <h2>Join as Student</h2>
        <form onSubmit={submit}>
          <label>Full Name</label>
          <input name="fullName" value={form.fullName} onChange={h} placeholder="Your full name" />
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={h} placeholder="you@example.com" />
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={h} placeholder="Min 6 characters" />
          <label>Confirm Password</label>
          <input name="confirm" type="password" value={form.confirm} onChange={h} />
          {err && <p className="error">{err}</p>}
          <button type="submit" style={{ width: '100%', marginTop: 16 }} disabled={busy}>
            {busy ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: 13 }}>
          Already a student? <Link href="/student/login" style={{ color: '#1a5276' }}>Login</Link>
        </p>
        <p style={{ fontSize: 13 }}>
          Want to register a group? <Link href="/group-owner/register" style={{ color: '#1e8449' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
