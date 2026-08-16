import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetsPage from './BudgetsPage'
import { useExpenses } from '../../expenses/hooks/useExpenses'
import { useBudgetLimits } from '../hooks/useBudgetLimits'

vi.mock('../../expenses/hooks/useExpenses', () => ({ useExpenses: vi.fn() }))
vi.mock('../hooks/useBudgetLimits', () => ({ useBudgetLimits: vi.fn() }))
vi.mock('../components/BudgetLimitsPanel', () => ({
  default: ({ limitMonthYear, setLimitMonthYear, totalsByCategory, upsertLimit, deleteLimit }) => (
    <div data-testid="budget-panel">
      <span data-testid="budget-month">{limitMonthYear}</span>
      <span data-testid="budget-totals">{JSON.stringify(totalsByCategory)}</span>
      <button onClick={() => setLimitMonthYear('2026-07')}>Choose July</button>
      <button onClick={() => upsertLimit({ category: 'food' })}>Upsert</button>
      <button onClick={() => deleteLimit(7)}>Delete</button>
    </div>
  ),
}))

describe('Budgets page ownership', () => {
  const upsertLimit = vi.fn()
  const deleteLimit = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0))
    useExpenses.mockReturnValue({
      expenses: [
        { category: 'food', amount: 12.34, date: new Date(2026, 7, 2).toISOString() },
        { category: 'bills', amount: 50, date: new Date(2026, 6, 2).toISOString() },
      ],
    })
    useBudgetLimits.mockReturnValue({
      budgetLimits: [],
      loading: false,
      upsertLimit,
      deleteLimit,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('owns the current budget month, monthly totals, and budget mutations', () => {
    render(<BudgetsPage />)

    expect(screen.getByRole('heading', { name: 'Budgets' })).toBeInTheDocument()
    expect(screen.getByTestId('budget-month')).toHaveTextContent('2026-08')
    expect(screen.getByTestId('budget-totals')).toHaveTextContent('{"food":12.34}')
    expect(useBudgetLimits).toHaveBeenLastCalledWith('2026-08')

    fireEvent.click(screen.getByRole('button', { name: 'Upsert' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(upsertLimit).toHaveBeenCalledWith({ category: 'food' })
    expect(deleteLimit).toHaveBeenCalledWith(7)
  })

  it('updates budget-limit and spending dependencies when the owned month changes', () => {
    render(<BudgetsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose July' }))

    expect(screen.getByTestId('budget-month')).toHaveTextContent('2026-07')
    expect(screen.getByTestId('budget-totals')).toHaveTextContent('{"bills":50}')
    expect(useBudgetLimits).toHaveBeenLastCalledWith('2026-07')
  })
})
