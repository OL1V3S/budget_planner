import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeMonthlyTotalsByCategory } from './totalsByCategory'

describe('monthly spending totals used by budgets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0))
  })

  afterEach(() => vi.useRealTimers())

  it('includes the current month through the end of today and excludes future days', () => {
    const result = computeMonthlyTotalsByCategory([
      { category: 'food', amount: 10.1, date: new Date(2026, 7, 1, 10).toISOString() },
      { category: 'food', amount: 2.22, date: new Date(2026, 7, 14, 20).toISOString() },
      { category: 'food', amount: 99, date: new Date(2026, 7, 15, 10).toISOString() },
      { category: 'bills', amount: 50, date: new Date(2026, 6, 31, 10).toISOString() },
    ], '2026-08')

    expect(result).toEqual({ food: 12.32 })
  })

  it('returns no spending for a future selected month', () => {
    expect(computeMonthlyTotalsByCategory([
      { category: 'food', amount: 10, date: new Date(2026, 8, 1).toISOString() },
    ], '2026-09')).toEqual({})
  })

  it('includes the full historical month and groups by exact category key', () => {
    const result = computeMonthlyTotalsByCategory([
      { category: 'food', amount: 1.115, date: new Date(2026, 6, 1).toISOString() },
      { category: 'food', amount: 2.225, date: new Date(2026, 6, 31, 23).toISOString() },
      { category: 'Food', amount: 4, date: new Date(2026, 6, 20).toISOString() },
      { category: '', amount: 3, date: new Date(2026, 6, 20).toISOString() },
    ], '2026-07')

    expect(result).toEqual({ food: 3.35, Food: 4, Uncategorized: 3 })
  })
})
