import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetLimitsPanel from './BudgetLimitsPanel'

const baseProps = {
  limitMonthYear: '2026-08',
  setLimitMonthYear: vi.fn(),
  budgetLimits: [],
  limitsLoading: false,
  totalsByCategory: {},
  upsertLimit: vi.fn(),
  deleteLimit: vi.fn(),
}

describe('existing budget-limit workflows', () => {
  beforeEach(() => vi.spyOn(window, 'alert').mockImplementation(() => {}))

  it('creates a limit with normalized category, money, and selected month', async () => {
    const user = userEvent.setup()
    const upsertLimit = vi.fn().mockResolvedValue(undefined)
    render(<BudgetLimitsPanel {...baseProps} upsertLimit={upsertLimit} />)

    await user.selectOptions(screen.getByRole('combobox'), 'food')
    await user.type(screen.getByPlaceholderText('Limit Amount'), '123.45')
    await user.click(screen.getByRole('button', { name: 'Save Limit' }))

    expect(upsertLimit).toHaveBeenCalledWith({
      category: 'food',
      limitAmount: 123.45,
      monthYear: new Date('2026-08-01T00:00:00').toISOString(),
    })
  })

  it('uses the other sentinel for a normalized custom budget category', async () => {
    const user = userEvent.setup()
    const upsertLimit = vi.fn().mockResolvedValue(undefined)
    render(<BudgetLimitsPanel {...baseProps} upsertLimit={upsertLimit} />)

    await user.selectOptions(screen.getByRole('combobox'), 'other')
    await user.type(screen.getByPlaceholderText('Custom Category'), '  Home Repair  ')
    await user.type(screen.getByPlaceholderText('Limit Amount'), '80')
    await user.click(screen.getByRole('button', { name: 'Save Limit' }))

    expect(upsertLimit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'home repair',
      limitAmount: 80,
    }))
  })

  it('updates an existing exact category without changing its key', async () => {
    const user = userEvent.setup()
    const upsertLimit = vi.fn().mockResolvedValue(undefined)
    render(<BudgetLimitsPanel
      {...baseProps}
      upsertLimit={upsertLimit}
      budgetLimits={[{ id: 7, category: 'Home Repair', limitAmount: 50 }]}
      totalsByCategory={{ 'Home Repair': 10 }}
    />)

    const row = screen.getByText('Home Repair').closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Edit' }))
    await user.clear(within(row).getByRole('textbox'))
    await user.type(within(row).getByRole('textbox'), '75.25')
    await user.click(within(row).getByRole('button', { name: 'Save' }))

    expect(upsertLimit).toHaveBeenCalledWith({
      category: 'Home Repair',
      limitAmount: 75.25,
      monthYear: new Date('2026-08-01T00:00:00').toISOString(),
    })
  })
})
