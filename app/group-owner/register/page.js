'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function OwnerRegister() {
  const supabase = createClient();
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '',
    groupName: '', description: '', joinPolicy: 'open',
  });
  const [subs, setSubs] = useState(['']);
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'done'

  const h  = e => setForm({ ...form, [e.target.name]: e.target.value });
  const hs = (i, v) => { const s = [...subs]; s[i] = v; setSubs(s); };

  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (!form.fullName || !form.email || !form.password || !form.groupName)
      return setErr('Full name, email, password and group name are required.');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');

    setBusy(true);

    // Step 1: Create the auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, role: 'group_owner' } },
    });

    if (authErr) { setBusy(false); return setErr(authErr.message); }

   // Supabase returns identities:[] when the email already exists (privacy protection)
if (authData?.user?.identities?.length === 0) {
  setBusy(false);
  return setErr('This email is already registered. Please login instead — your account was created but the group setup did not complete.');
}
const uid = authData?.user?.id;
if (!uid) { setBusy(false); return setErr('Failed to create account. Please try again.'); }

    // Wait briefly for the DB trigger to create the profile row
    await new Promise(r => setTimeout(r, 800));

    // Step 2: Create the group via server-side API (bypasses RLS, works even without a session)
    const res = await fetch('/api/create-group-for-new-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
  userId: uid,
  email: form.email,
  fullName: form.fullName,
  groupName: form.groupName,
  description: form.description,
  joinPolicy: form.joinPolicy,
  subgroups: subs,
}),
    });

    const result = await res.json();
    setBusy(false);

    if (!res.ok) return setErr(result.error || 'Group creation failed. Please try again.');

    // Step 3: Redirect based on whether we have a live session
    if (authData?.session) {
      // Email confirmation is disabled — log them in directly
      window.location.href = '/owner-dashboard';
    } else {
      // Email confirmation is required — show confirm screen
      setStep('confirm');
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
          <Link href="/group-owner/login">
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
        <Link href="/group-owner/login" style={{ color: '#fff', marginLeft: 14, fontSize: 14 }}>Already registered?</Link>
      </nav>
      <div className="form-box" style={{ maxWidth: 540 }}>
        <h2>Register Your Group</h2>
        <form onSubmit={submit}>
          <label>Your Full Name</label>
          <input name="fullName" value={form.fullName} onChange={h} placeholder="Your name" />
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={h} placeholder="you@example.com" />
          <label>Password</label>
          <input name="password" type="password" value={form.password} onChange={h} placeholder="Min 6 characters" />
          <label>Confirm Password</label>
          <input name="confirm" type="password" value={form.confirm} onChange={h} />

          <hr style={{ margin: '18px 0' }} />

          <label>Group Name</label>
          <input name="groupName" value={form.groupName} onChange={h} placeholder="e.g. NUST CS Batch 2024" />
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={h} rows={3} placeholder="What is this group about?" />
          <label>Join Policy</label>
          <select name="joinPolicy" value={form.joinPolicy} onChange={h}>
            <option value="open">Open — anyone can join directly</option>
            <option value="approval">Approval Required — you approve each member</option>
          </select>

          <label style={{ marginTop: 16 }}>Subgroups (optional)</label>
          {subs.map((s, i) => (
            <div className="sub-row" key={i}>
              <input value={s} onChange={e => hs(i, e.target.value)} placeholder={`Subgroup ${i + 1} name`} />
              {subs.length > 1 && (
                <button type="button" className="btn-danger btn-sm"
                  onClick={() => setSubs(subs.filter((_, x) => x !== i))}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary btn-sm"
            onClick={() => setSubs([...subs, ''])} style={{ marginBottom: 16 }}>
            + Add Subgroup
          </button>

          {err && <p className="error">{err}</p>}
          <button type="submit" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? 'Creating account & group...' : 'Register Group'}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: 13 }}>
          Already registered? <Link href="/group-owner/login" style={{ color: '#1a5276' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
