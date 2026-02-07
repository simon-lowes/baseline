/**
 * Unit tests for adapter modules
 *
 * Tests the noop adapter (noopDb, noopAuth) contract compliance.
 * These are pure logic tests — no Supabase or network calls.
 */
import { describe, it, expect } from 'vitest'
import { noopDb } from '../noop/noopDb'
import { noopAuth } from '../noop/noopAuth'

// ============================================================================
// noopDb
// ============================================================================

describe('noopDb', () => {
  it('select returns error', async () => {
    const result = await noopDb.select('entries')
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toContain('not configured')
  })

  it('insert returns error', async () => {
    const result = await noopDb.insert('entries', { id: '1' })
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })

  it('update returns error', async () => {
    const result = await noopDb.update('entries', { id: '1' }, { notes: 'x' })
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })

  it('delete returns error', async () => {
    const result = await noopDb.delete('entries', { id: '1' })
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })

  it('all operations return the same error message', async () => {
    const results = await Promise.all([
      noopDb.select('t'),
      noopDb.insert('t', {}),
      noopDb.update('t', {}, {}),
      noopDb.delete('t', {}),
    ])
    for (const r of results) {
      expect(r.error?.message).toBe('Database not configured')
    }
  })
})

// ============================================================================
// noopAuth
// ============================================================================

describe('noopAuth', () => {
  describe('auth operations return errors', () => {
    it('signUp returns error', async () => {
      const result = await noopAuth.signUp({ email: 'a@b.com', password: 'pass' })
      expect(result.user).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toContain('not configured')
    })

    it('signIn returns error', async () => {
      const result = await noopAuth.signIn({ email: 'a@b.com', password: 'pass' })
      expect(result.user).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })

    it('signInWithMagicLink returns error', async () => {
      const result = await noopAuth.signInWithMagicLink({ email: 'a@b.com' })
      expect(result.error).toBeInstanceOf(Error)
    })

    it('resetPassword returns error', async () => {
      const result = await noopAuth.resetPassword({ email: 'a@b.com' })
      expect(result.error).toBeInstanceOf(Error)
    })

    it('updatePassword returns error', async () => {
      const result = await noopAuth.updatePassword({ newPassword: 'newpass' })
      expect(result.error).toBeInstanceOf(Error)
    })

    it('resend returns error', async () => {
      const result = await noopAuth.resend({ type: 'signup', email: 'a@b.com' })
      expect(result.error).toBeInstanceOf(Error)
    })

    it('checkUserExists returns error', async () => {
      const result = await noopAuth.checkUserExists('a@b.com')
      expect(result.exists).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
    })

    it('deleteAccount returns error', async () => {
      const result = await noopAuth.deleteAccount()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('safe no-op operations', () => {
    it('signOut succeeds (no error)', async () => {
      const result = await noopAuth.signOut()
      expect(result.error).toBeNull()
    })

    it('getSession returns null', async () => {
      const result = await noopAuth.getSession()
      expect(result).toBeNull()
    })

    it('waitForInitialValidation returns null', async () => {
      const result = await noopAuth.waitForInitialValidation()
      expect(result).toBeNull()
    })

    it('getUser returns null', () => {
      expect(noopAuth.getUser()).toBeNull()
    })

    it('onAuthStateChange returns unsubscribe function', () => {
      const sub = noopAuth.onAuthStateChange(() => {})
      expect(sub.unsubscribe).toBeInstanceOf(Function)
      // Calling unsubscribe should not throw
      sub.unsubscribe()
    })

    it('ensureDefaultTracker completes without error', async () => {
      await expect(noopAuth.ensureDefaultTracker()).resolves.toBeUndefined()
    })
  })
})
