import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId, email, fullName, groupName, description, joinPolicy, subgroups } = await req.json();

    if (!userId || !groupName)
      return NextResponse.json({ error: 'userId and groupName are required.' }, { status: 400 });

    const admin = createAdminClient();

    // Upsert profile in case the DB trigger hasn't fired yet
    const { error: profileErr } = await admin.from('profiles').upsert(
      { id: userId, email, full_name: fullName, role: 'group_owner' },
      { onConflict: 'id' }
    );
    if (profileErr) return NextResponse.json({ error: 'Profile setup failed (FK): ' + profileErr.message + ' — Try logging in instead if you already registered.' }, { status: 500 });
    // Create the group using admin client — bypasses RLS safely
    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({
        owner_id: userId,
        group_name: groupName,
        description: description || '',
        status: 'pending',
        join_policy: joinPolicy || 'open',
      })
      .select()
      .single();

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

    // Create subgroups
    const validSubs = (subgroups || []).filter(s => s?.trim());
    if (validSubs.length > 0) {
      await admin.from('groups').insert(
        validSubs.map(name => ({
          owner_id: userId,
          group_name: name.trim(),
          parent_group_id: group.id,
          status: 'pending',
          join_policy: joinPolicy || 'open',
        }))
      );
    }

    return NextResponse.json({ success: true, groupId: group.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
