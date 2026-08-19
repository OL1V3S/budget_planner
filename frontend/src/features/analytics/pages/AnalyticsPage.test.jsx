import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AnalyticsPage from './AnalyticsPage'
import { useExpenses } from '../../expenses/hooks/useExpenses'
import { useBudgetLimits } from '../../budgetLimits/hooks/useBudgetLimits'

vi.mock('../../expenses/hooks/useExpenses', () => ({ useExpenses: vi.fn() }))
vi.mock('../../budgetLimits/hooks/useBudgetLimits', () => ({ useBudgetLimits: vi.fn() }))
vi.mock('../../../charts/components/SpendingChart', () => ({
  default: ({ totalsByCategory, budgetLimitsByCategory }) => (
    <div data-testid="spending-chart">
      {JSON.stringify({ totalsByCategory, budgetLimitsByCategory })}
    </div>
  ),
}))

describe('Analytics page ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0))
    useExpenses.mockReturnValue({
      expenses: [
        { category: 'food', amount: 12.34, date: '2026-08-02' },
        { category: 'bills', amount: 50, date: '2026-07-02' },
      ],
      loading: false,
    })
    useBudgetLimits.mockReturnValue({
      budgetLimits: [{ id: 7, category: 'food', limitAmount: 100 }],
      loading: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('owns the current chart month and exact chart data mapping', () => {
    render(<AnalyticsPage />)

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByLabelText('Chart month')).toHaveValue('2026-08')
    expect(useBudgetLimits).toHaveBeenLastCalledWith('2026-08')
    expect(screen.getByTestId('spending-chart')).toHaveTextContent('"totalsByCategory":{"food":12.34}')
    expect(screen.getByTestId('spending-chart')).toHaveTextContent('"budgetLimitsByCategory":{"food":{"id":7')
  })

  it('updates both chart dependencies when the selected month changes', () => {
    render(<AnalyticsPage />)

    fireEvent.change(screen.getByLabelText('Chart month'), { target: { value: '2026-07' } })

    expect(useBudgetLimits).toHaveBeenLastCalledWith('2026-07')
    expect(screen.getByTestId('spending-chart')).toHaveTextContent('"totalsByCategory":{"bills":50}')
  })

  it('shows loading without rendering transient chart data', () => {
    useExpenses.mockReturnValue({ expenses: [], loading: true })
    render(<AnalyticsPage />)

    expect(screen.getByText('Loading spending analytics...')).toBeInTheDocument()
    expect(screen.queryByTestId('spending-chart')).not.toBeInTheDocument()
  })

  it('explains spending-only chart data when no limits exist', () => {
    useBudgetLimits.mockReturnValue({ budgetLimits: [], loading: false })
    render(<AnalyticsPage />)

    expect(screen.getByText(/No budget limits are set for this month/)).toBeInTheDocument()
    expect(screen.getByTestId('spending-chart')).toBeInTheDocument()
  })

  it('preserves the chart empty state when no spending or limits exist', () => {
    useExpenses.mockReturnValue({ expenses: [], loading: false })
    useBudgetLimits.mockReturnValue({ budgetLimits: [], loading: false })
    render(<AnalyticsPage />)

    expect(screen.getByTestId('spending-chart')).toHaveTextContent('"totalsByCategory":{}')
    expect(screen.queryByText(/The chart shows recorded spending only/)).not.toBeInTheDocument()
  })
})
