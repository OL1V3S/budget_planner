import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OverviewPage from './OverviewPage'
import { useExpenses } from '../../features/expenses/hooks/useExpenses'
import { useBudgetLimits } from '../../features/budgetLimits/hooks/useBudgetLimits'

vi.mock('../../features/expenses/hooks/useExpenses', () => ({ useExpenses: vi.fn() }))
vi.mock('../../features/budgetLimits/hooks/useBudgetLimits', () => ({ useBudgetLimits: vi.fn() }))

function renderPage() {
  return render(<MemoryRouter><OverviewPage /></MemoryRouter>)
}

describe('Overview current-month summary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0))
    useExpenses.mockReturnValue({
      expenses: [
        { category: 'food', amount: 90, date: new Date(2026, 7, 2).toISOString() },
        { category: 'Food', amount: 10, date: new Date(2026, 7, 3).toISOString() },
        { category: 'food', amount: 500, date: new Date(2026, 7, 15).toISOString() },
      ],
      loading: false,
    })
    useBudgetLimits.mockReturnValue({
      budgetLimits: [
        { category: 'food', limitAmount: 100 },
        { category: 'Food', limitAmount: 20 },
      ],
      loading: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('derives only the approved signals with exact categories and future-day exclusion', () => {
    renderPage()

    expect(useBudgetLimits).toHaveBeenLastCalledWith('2026-08')
    expect(screen.getByText('$100.00')).toBeInTheDocument()

    const categoriesCard = screen.getByText('Categories with recorded spending').closest('.card')
    expect(within(categoriesCard).getByText('2')).toBeInTheDocument()

    const attentionCard = screen.getByText('Budget-limit attention').closest('.card')
    expect(within(attentionCard).getByText('1')).toBeInTheDocument()
    expect(attentionCard).toHaveTextContent('limit is at or above 90% used · 2 limits set')
  })

  it('shows a loading status instead of transient metrics', () => {
    useExpenses.mockReturnValue({ expenses: [], loading: true })
    renderPage()

    expect(screen.getByText('Loading current-month summary...')).toBeInTheDocument()
    expect(screen.queryByText('Recorded spending this month')).not.toBeInTheDocument()
  })

  it('keeps expense metrics useful and explains when no limits exist', () => {
    useExpenses.mockReturnValue({
      expenses: [{ category: 'food', amount: 12.34, date: new Date(2026, 7, 2).toISOString() }],
      loading: false,
    })
    useBudgetLimits.mockReturnValue({ budgetLimits: [], loading: false })
    renderPage()

    expect(screen.getByText('$12.34')).toBeInTheDocument()
    expect(screen.getByText('No budget limits are set for this month.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Set budget limits/ })).toHaveAttribute('href', '/budgets')
  })

  it('renders honest zero values and an empty status for an empty month', () => {
    useExpenses.mockReturnValue({ expenses: [], loading: false })
    useBudgetLimits.mockReturnValue({ budgetLimits: [], loading: false })
    renderPage()

    expect(screen.getByText('No recorded spending or budget limits for this month yet.')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(2)
  })
})
