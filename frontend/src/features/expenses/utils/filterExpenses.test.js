import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterExpenses } from './filterExpenses'

const expenses = [
  { id: 1, description: 'Coffee Shop', category: 'food', date: '2026-08-14T12:00:00Z' },
  { id: 2, description: 'Monthly Pass', category: 'transport', date: '2026-08-07T12:00:00Z' },
  { id: 3, description: 'Electric Bill', category: 'bills', date: '2026-07-15T12:00:00Z' },
  { id: 4, description: 'Prescription', category: 'medical', date: '2026-08-01T12:00:00Z' },
  { id: 5, description: 'Old Concert', category: 'entertainment', date: '2026-06-01T12:00:00Z' },
]

const baseFilters = {
  dateFilter: 'all',
  customStartDate: '',
  customEndDate: '',
  categoryFilter: '',
  searchTerm: '',
}

describe('expense filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T18:00:00Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('searches descriptions and categories case-insensitively', () => {
    expect(filterExpenses(expenses, { ...baseFilters, searchTerm: 'COFFEE' }).map((x) => x.id)).toEqual([1])
    expect(filterExpenses(expenses, { ...baseFilters, searchTerm: 'MEDICAL' }).map((x) => x.id)).toEqual([4])
  })

  it('matches a selected default category case-insensitively', () => {
    expect(filterExpenses(expenses, { ...baseFilters, categoryFilter: 'Food' }).map((x) => x.id)).toEqual([1])
  })

  it('uses case-sensitive default-category membership for the Other filter', () => {
    const result = filterExpenses([
      ...expenses,
      { id: 6, description: 'Capitalized category', category: 'Food', date: '2026-08-10T12:00:00Z' },
    ], { ...baseFilters, categoryFilter: 'Other' })

    expect(result.map((x) => x.id)).toEqual([1, 2, 3, 4, 5])
  })

  it.each([
    ['last7', [1]],
    ['last30', [1, 2, 4]],
    ['thisMonth', [1, 2, 4]],
  ])('applies the %s relative date filter', (dateFilter, expectedIds) => {
    expect(filterExpenses(expenses, { ...baseFilters, dateFilter }).map((x) => x.id)).toEqual(expectedIds)
  })

  it('interprets custom date endpoints at midnight', () => {
    const result = filterExpenses(expenses, {
      ...baseFilters,
      dateFilter: 'custom',
      customStartDate: '2026-08-01',
      customEndDate: '2026-08-07',
    })

    expect(result.map((x) => x.id)).toEqual([4])
  })
})
