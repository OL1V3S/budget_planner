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

  it('exposes a selected-month fetch error without stale limits', async () => {
    const requestError = new Error('unavailable')
    budgetLimitsApi.getByMonth.mockRejectedValue(requestError)
    const { result } = renderHook(() => useBudgetLimits('2026-08'))

    await waitFor(() => expect(result.current.error).toBe(requestError))
    expect(result.current.budgetLimits).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('ignores an older month response after the selection changes', async () => {
    let resolveJuly
    let resolveAugust
    budgetLimitsApi.getByMonth.mockImplementation((month) => new Promise((resolve) => {
      if (month === '2026-07') resolveJuly = resolve
      if (month === '2026-08') resolveAugust = resolve
    }))
    const { result, rerender } = renderHook(
      ({ month }) => useBudgetLimits(month),
      { initialProps: { month: '2026-07' } }
    )
    await waitFor(() => expect(resolveJuly).toBeTypeOf('function'))

    rerender({ month: '2026-08' })
    await waitFor(() => expect(resolveAugust).toBeTypeOf('function'))
    await act(() => resolveJuly({ data: [{ id: 7, category: 'old' }] }))
    expect(result.current.budgetLimits).toEqual([])

    await act(() => resolveAugust({ data: [{ id: 8, category: 'current' }] }))
    expect(result.current.budgetLimits).toEqual([{ id: 8, category: 'current' }])
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

describe('budget read and write outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    budgetLimitsApi.getByMonth.mockResolvedValue({ data: [] })
  })
  it.each([
    ['upsertLimit', 'upsert', [{ category: 'food', limitAmount: 0, monthYear: '2026-08-01T05:00:00.000Z' }]],
    ['deleteLimit', 'remove', [7]],
  ])('retains successful %s when its subsequent read fails', async (method, apiMethod, args) => {
    const { result } = renderHook(() => useBudgetLimits('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    budgetLimitsApi[apiMethod].mockResolvedValueOnce({})
    const error = new Error('read failed')
    budgetLimitsApi.getByMonth.mockRejectedValueOnce(error)
    let outcome
    await act(async () => { outcome = await result.current[method](...args) })
    expect(outcome).toEqual({ refreshFailed: true })
    expect(result.current.error).toBe(error)
    expect(budgetLimitsApi[apiMethod]).toHaveBeenCalledExactlyOnceWith(...args)
  })
  it('preserves write rejection and does not turn it into a completed save', async () => {
    const { result } = renderHook(() => useBudgetLimits('2026-08'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const error = new Error('write failed')
    budgetLimitsApi.upsert.mockRejectedValueOnce(error)
    await act(async () => { await expect(result.current.upsertLimit({})).rejects.toBe(error) })
    expect(budgetLimitsApi.getByMonth).toHaveBeenCalledTimes(1)
  })
  it('never exposes old limits under the newly selected month, including the render before effects', async () => {
    const observations = []
    budgetLimitsApi.getByMonth.mockImplementation((month) => month === '2026-08'
      ? Promise.resolve({ data: [{ id: 1, category: 'old month' }] }) : new Promise(() => {}))
    const { result, rerender } = renderHook(({ month }) => {
      const value = useBudgetLimits(month)
      observations.push({ month, limits: value.budgetLimits, loading: value.loading })
      return value
    }, { initialProps: { month: '2026-08' } })
    await waitFor(() => expect(result.current.budgetLimits).toHaveLength(1))
    rerender({ month: '2026-09' })
    expect(observations.filter((value) => value.month === '2026-09').every((value) => value.loading && value.limits.length === 0)).toBe(true)
  })
  it('clears the view for an empty month selection without requesting an empty month', async () => {
    const { result, rerender } = renderHook(({ month }) => useBudgetLimits(month), { initialProps: { month: '2026-08' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender({ month: '' })
    expect(result.current.budgetLimits).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(budgetLimitsApi.getByMonth).not.toHaveBeenCalledWith('')
  })
  it('does not revive old limits while reselecting the same month after clearing it', async () => {
    const observations = []
    budgetLimitsApi.getByMonth.mockResolvedValueOnce({ data: [{ id: 1, category: 'old result' }] })
    const { result, rerender } = renderHook(({ month }) => {
      const value = useBudgetLimits(month)
      observations.push({ month, limits: value.budgetLimits, loading: value.loading })
      return value
    }, { initialProps: { month: '2026-08' } })
    await waitFor(() => expect(result.current.budgetLimits).toHaveLength(1))
    rerender({ month: '' })
    observations.length = 0
    budgetLimitsApi.getByMonth.mockImplementationOnce(() => new Promise(() => {}))
    rerender({ month: '2026-08' })
    expect(observations.length).toBeGreaterThan(0)
    expect(observations.every((value) => value.loading && value.limits.length === 0)).toBe(true)
  })
})
