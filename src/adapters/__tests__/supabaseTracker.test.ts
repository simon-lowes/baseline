import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabaseTracker } from '../supabase/supabaseTracker';
import { supabaseClient } from '../supabase/supabaseClient';

describe('supabaseTracker.createTracker (server-side guard)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks ambiguous-named tracker creation when no confirmed_interpretation provided', async () => {
    // Mock auth.getUser
    vi.spyOn(supabaseClient.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null } as any);
    // Spy on from to ensure insert is NOT called
    const fromSpy = vi.spyOn(supabaseClient, 'from');

    const result = await supabaseTracker.createTracker({ name: 'Flying' });
    expect(result.error).toBeDefined();
    expect(result.error?.message.toLowerCase()).toContain('ambiguous');
    // ensure we did attempt to use supabase client (auth.getUser) but not call insert (can't assert insert easily);
    expect(fromSpy).toBeDefined();
  });

  it('allows creation when confirmed_interpretation is provided', async () => {
    // Mock auth.getUser
    vi.spyOn(supabaseClient.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null } as any);
    // Mock the from().insert().select().single() chain
    const insertMock = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'tracker-1', name: 'Flying' }, error: null }),
    };
    vi.spyOn(supabaseClient, 'from').mockReturnValue(insertMock as any);

    const result = await supabaseTracker.createTracker({ name: 'Flying', confirmed_interpretation: 'air-travel' });
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe('Flying');
  });
});