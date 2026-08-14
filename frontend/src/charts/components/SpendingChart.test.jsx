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
  })

  it('shows the existing empty state when neither input contains categories', () => {
    render(<SpendingChart totalsByCategory={{}} budgetLimitsByCategory={{}} />)
    expect(screen.getByText('No data to display chart.')).toBeInTheDocument()
  })
})
