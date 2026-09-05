import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import client from './client'
import { authApi } from './authApi'
import { establishSession, getSessionSnapshot, subscribeToSession } from '../auth/session'

const operations = [
  ['register', '/api/auth/register', { email: 'person@example.com', password: 'Synthetic1!' }],
  ['login', '/api/auth/login', { email: 'person@example.com', password: 'Synthetic1!' }],
  ['resendConfirmation', '/api/auth/resend-confirmation', { email: 'person@example.com' }],
  ['confirmEmail', '/api/auth/confirm-email', { userId: 'synthetic-user', token: 'confirmation+value' }],
  ['forgotPassword', '/api/auth/forgot-password', { email: 'person@example.com' }],
  ['resetPassword', '/api/auth/reset-password', { email: 'person@example.com', token: 'reset+value', newPassword: 'Synthetic2!' }],
]

describe('public authentication requests', () => {
  let originalAdapter
  let unsubscribe

  beforeEach(() => {
    originalAdapter = client.defaults.adapter
    localStorage.clear()
    establishSession('stored-token', 'person@example.com')
  })

  afterEach(() => {
    client.defaults.adapter = originalAdapter
    unsubscribe?.()
    unsubscribe = undefined
  })

  it.each(operations)('%s preserves its request and error behavior without invalidating a session', async (operation, url, payload) => {
    const current = getSessionSnapshot()
    const listener = vi.fn()
    unsubscribe = subscribeToSession(listener)
    let requestConfig
    let originalError
    const adapter = vi.fn(async (config) => {
      requestConfig = config
      originalError = new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401, statusText: 'Unauthorized', data: 'Public authentication error', headers: {}, config,
      })
      throw originalError
    })
    client.defaults.adapter = adapter

    const error = await authApi[operation](payload).catch((failure) => failure)

    expect(requestConfig.url).toBe(url)
    expect(requestConfig.method).toBe('post')
    expect(JSON.parse(requestConfig.data)).toEqual(payload)
    expect(requestConfig.headers.Authorization).toBe('Bearer stored-token')
    expect(error).toBe(originalError)
    expect(error.response.data).toBe('Public authentication error')
    expect(adapter).toHaveBeenCalledOnce()
    expect(getSessionSnapshot()).toBe(current)
    expect(listener).not.toHaveBeenCalled()
  })
})
