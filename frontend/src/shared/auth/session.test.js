import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, establishSession, getSessionSnapshot, invalidateSession, subscribeToSession } from './session'

const subscriptions = []

function subscribe(listener = vi.fn()) {
  const unsubscribe = subscribeToSession(listener)
  subscriptions.push(unsubscribe)
  return { listener, unsubscribe }
}

function storageEvent(key, storageArea = localStorage, newValue = null) {
  window.dispatchEvent(new StorageEvent('storage', { key, storageArea, newValue }))
}

describe('shared authentication session', () => {
  beforeEach(() => {
    localStorage.clear()
    getSessionSnapshot()
  })

  afterEach(() => subscriptions.splice(0).forEach((unsubscribe) => unsubscribe()))

  it('reads existing keys and returns the same snapshot while values are unchanged', () => {
    localStorage.setItem('token', 'stored-token')
    localStorage.setItem('email', 'person@example.com')
    const session = getSessionSnapshot()

    expect(session).toMatchObject({ token: 'stored-token', email: 'person@example.com' })
    expect(getSessionSnapshot()).toBe(session)
  })

  it('establishes and clears a session without changing unrelated storage', () => {
    localStorage.setItem('budget-planner-theme', 'dark')
    const { listener } = subscribe()
    establishSession('new-token', 'person@example.com')

    expect(getSessionSnapshot()).toMatchObject({ token: 'new-token', email: 'person@example.com' })
    expect(localStorage.getItem('token')).toBe('new-token')
    expect(localStorage.getItem('email')).toBe('person@example.com')
    expect(listener).toHaveBeenCalledTimes(1)

    clearSession()

    expect(getSessionSnapshot()).toMatchObject({ token: null, email: null })
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    expect(localStorage.getItem('budget-planner-theme')).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls).toEqual([[], []])
  })

  it('invalidates the matching session only once', () => {
    establishSession('old-token', 'person@example.com')
    const requestSession = getSessionSnapshot()
    const { listener } = subscribe()

    expect(invalidateSession(requestSession)).toBe(true)
    expect(invalidateSession(requestSession)).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('rejects stale invalidation after establishing the same token again', () => {
    establishSession('same-token', 'person@example.com')
    const oldSession = getSessionSnapshot()
    establishSession('same-token', 'person@example.com')

    expect(getSessionSnapshot().generation).not.toBe(oldSession.generation)
    expect(invalidateSession(oldSession)).toBe(false)
    expect(localStorage.getItem('token')).toBe('same-token')
  })

  it('reconciles a different token before a queued storage event arrives', () => {
    establishSession('old-token', 'old@example.com')
    const oldSession = getSessionSnapshot()
    localStorage.setItem('token', 'other-tab-token')
    localStorage.setItem('email', 'new@example.com')

    expect(invalidateSession(oldSession)).toBe(false)
    expect(getSessionSnapshot()).toMatchObject({ token: 'other-tab-token', email: 'new@example.com' })
  })

  it('observes other-tab logout and email changes with stable snapshots', () => {
    establishSession('stored-token', 'old@example.com')
    const { listener } = subscribe()
    const previous = getSessionSnapshot()
    localStorage.setItem('email', 'new@example.com')
    storageEvent('email', localStorage, 'new@example.com')

    expect(getSessionSnapshot()).toMatchObject({ token: 'stored-token', email: 'new@example.com', generation: previous.generation })
    expect(getSessionSnapshot()).not.toBe(previous)
    expect(getSessionSnapshot()).toBe(getSessionSnapshot())

    localStorage.removeItem('token')
    localStorage.removeItem('email')
    storageEvent('token')
    expect(getSessionSnapshot()).toMatchObject({ token: null, email: null })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('handles localStorage clear without reacting to unrelated storage events', () => {
    establishSession('stored-token', 'person@example.com')
    const { listener } = subscribe()
    storageEvent('budget-planner-theme')
    storageEvent('token', sessionStorage)
    expect(listener).not.toHaveBeenCalled()

    localStorage.clear()
    storageEvent(null)
    expect(getSessionSnapshot()).toMatchObject({ token: null, email: null })
    expect(listener).toHaveBeenCalledOnce()
  })

  it('does not replay stale event values or advance an already reconciled generation', () => {
    establishSession('old-token', 'old@example.com')
    localStorage.setItem('token', 'new-token')
    localStorage.setItem('email', 'new@example.com')
    const current = getSessionSnapshot()
    const { listener } = subscribe()
    storageEvent('token', localStorage, 'old-token')

    expect(getSessionSnapshot()).toBe(current)
    expect(listener).toHaveBeenCalledOnce()
    expect(invalidateSession(current)).toBe(true)
  })

  it('cleans up listeners and reads invalidation that happened before subscribing', () => {
    establishSession('old-token', 'person@example.com')
    const { listener, unsubscribe } = subscribe()
    unsubscribe()
    clearSession()
    storageEvent('token')
    expect(listener).not.toHaveBeenCalled()

    const next = subscribe()
    expect(getSessionSnapshot()).toMatchObject({ token: null, email: null })
    establishSession('new-token', 'person@example.com')
    expect(next.listener).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
  })
})
