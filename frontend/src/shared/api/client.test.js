import { beforeEach, describe, expect, it } from 'vitest'
import client from './client'

describe('API authorization', () => {
  beforeEach(() => localStorage.clear())

  it('adds the stored token using the existing bearer request shape', async () => {
    localStorage.setItem('token', 'jwt-value')
    let requestConfig

    await client.get('/api/expenses', {
      adapter: async (config) => {
        requestConfig = config
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      },
    })

    expect(requestConfig.headers.Authorization).toBe('Bearer jwt-value')
  })

  it('does not add authorization when no token is stored', async () => {
    let requestConfig

    await client.get('/api/expenses', {
      adapter: async (config) => {
        requestConfig = config
        return {
          data: [],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      },
    })

    expect(requestConfig.headers.Authorization).toBeUndefined()
  })
})
