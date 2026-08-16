import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SpendingChart from './SpendingChart'

vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }) => <pre data-testid="chart-data">{JSON.stringify(data)}</pre>,
}))

describe('spending chart data', () => {
  it('unions spending and limit categories once and keeps both datasets aligned', () => {
    render(<SpendingChart
      totalsByCategory={{ food: 25, transport: 10 }}
      budgetLimitsByCategory={{
        food: { limitAmount: 100 },
        bills: { limitAmount: 80 },
      }}
    />)

    const data = JSON.parse(screen.getByTestId('chart-data').textContent)
    expect(data.labels).toEqual(['Food', 'Transport', 'Bills'])
    expect(data.datasets[0]).toMatchObject({ label: 'Spent', data: [25, 10, 0] })
    expect(data.datasets[1]).toMatchObject({ label: 'Budget Limit', data: [100, 0, 80] })

    expect(screen.getByTestId('chart-data').parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('heading', { name: 'Spending and budget limit data' })).toBeInTheDocument()

    const foodRow = screen.getByText('Food').closest('li')
    expect(foodRow).toHaveTextContent('Spent: $25.00')
    expect(foodRow).toHaveTextContent('Budget limit: $100.00')

    const transportRow = screen.getByText('Transport').closest('li')
    expect(transportRow).toHaveTextContent('Spent: $10.00')
    expect(transportRow).toHaveTextContent('Budget limit: $0.00')

    const billsRow = screen.getByText('Bills').closest('li')
    expect(billsRow).toHaveTextContent('Spent: $0.00')
    expect(billsRow).toHaveTextContent('Budget limit: $80.00')
  })

  it('shows the existing empty state when neither input contains categories', () => {
    render(<SpendingChart totalsByCategory={{}} budgetLimitsByCategory={{}} />)
    expect(screen.getByText('No data to display chart.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Spending and budget limit data' })).not.toBeInTheDocument()
  })
})
