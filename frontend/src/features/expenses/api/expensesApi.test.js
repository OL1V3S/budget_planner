import { beforeEach, describe, expect, it, vi } from 'vitest'
import client from '../../../shared/api/client'
import { expensesApi } from './expensesApi'

vi.mock('../../../shared/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('expense API contract', () => {
  beforeEach(() => client.put.mockResolvedValue({ status: 204 }))

  it('uses the expense id in both the PUT URL and body', async () => {
    const payload = {
      id: 42,
      description: 'new name',
      amount: 12.35,
      date: '2026-08-10',
      category: 'home repair',
    }

    await expensesApi.update(42, payload)

    expect(client.put).toHaveBeenCalledWith('/api/expenses/42', payload)
    expect(client.put.mock.calls[0][1].id).toBe(42)
  })
})
