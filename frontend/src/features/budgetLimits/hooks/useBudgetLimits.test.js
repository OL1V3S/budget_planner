import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { budgetLimitsApi } from '../api/budgetLimitsApi'
import { useBudgetLimits } from './useBudgetLimits'

vi.mock('../api/budgetLimitsApi', () => ({
  budgetLimitsApi: {
    getByMonth: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}))

describe('budget-limit refresh behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    budgetLimitsApi.getByMonth.mockResolvedValue({ data: [] })
  })

  it('upserts and refreshes the currently selected month', async () => {
    const payload = { category: 'food', limitAmount: 100, monthYear: '2026-08-01T05:00:00.000Z' }
    const { result } = renderHook(() => useBudgetLimits('2026-08'))
    await waitFor(() => expect(budgetLimitsApi.getByMonth).toHaveBeenCalledWith('2026-08'))

    await act(() => result.current.upsertLimit(payload))

    expect(budgetLimitsApi.upsert).toHaveBeenCalledWith(payload)
    expect(budgetLimitsApi.getByMonth).toHaveBeenCalledTimes(2)
    expect(budgetLimitsApi.getByMonth).toHaveBeenLastCalledWith('2026-08')
  })

  it('deletes and refreshes the currently selected month', async () => {
    const { result } = renderHook(() => useBudgetLimits('2026-08'))
    await waitFor(() => expect(budgetLimitsApi.getByMonth).toHaveBeenCalledWith('2026-08'))

    await act(() => result.current.deleteLimit(12))

    expect(budgetLimitsApi.remove).toHaveBeenCalledWith(12)
    expect(budgetLimitsApi.getByMonth).toHaveBeenCalledTimes(2)
    expect(budgetLimitsApi.getByMonth).toHaveBeenLastCalledWith('2026-08')
  })
})
