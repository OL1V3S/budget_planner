import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TransactionsPage from './TransactionsPage'
import { useExpenses } from '../../expenses/hooks/useExpenses'

vi.mock('../../expenses/hooks/useExpenses', () => ({ useExpenses: vi.fn() }))

const baseExpensesHook = {
  expenses: [],
  loading: false,
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}

describe('existing expense workflows', () => {
  beforeEach(() => {
    useExpenses.mockReturnValue({ ...baseExpensesHook })
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('normalizes a default category and description before adding an expense', async () => {
    const user = userEvent.setup()
    const addExpense = vi.fn().mockResolvedValue(undefined)
    useExpenses.mockReturnValue({ ...baseExpensesHook, addExpense })
    render(<TransactionsPage />)

    await user.type(screen.getByPlaceholderText('Description'), '  Dinner With Friends  ')
    await user.type(screen.getByPlaceholderText('Amount'), '12.50')
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-08-14' } })
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'food')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(addExpense).toHaveBeenCalledWith({
      description: 'dinner with friends',
      amount: 12.5,
      date: '2026-08-14',
      category: 'food',
    })
  })

  it('uses the other sentinel to send a normalized custom category', async () => {
    const user = userEvent.setup()
    const addExpense = vi.fn().mockResolvedValue(undefined)
    useExpenses.mockReturnValue({ ...baseExpensesHook, addExpense })
    render(<TransactionsPage />)

    await user.type(screen.getByPlaceholderText('Description'), 'Prescription')
    await user.type(screen.getByPlaceholderText('Amount'), '8')
    fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-08-14' } })
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'other')
    await user.type(screen.getByPlaceholderText('Custom Category'), '  Medical Care  ')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(addExpense).toHaveBeenCalledWith(expect.objectContaining({
      category: 'medical care',
    }))
  })

  it('edits a custom-category expense with the URL id in the PUT body and rounds its amount', async () => {
    const user = userEvent.setup()
    const updateExpense = vi.fn().mockResolvedValue(undefined)
    useExpenses.mockReturnValue({
      ...baseExpensesHook,
      updateExpense,
      expenses: [{
        id: 42,
        description: 'old name',
        amount: 12,
        date: '2026-08-10T00:00:00Z',
        category: 'medical',
      }],
    })
    render(<TransactionsPage />)

    const row = screen.getByText('Medical').closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Edit' }))

    expect(within(row).getByLabelText('Edit description')).toBeInTheDocument()
    expect(within(row).getByLabelText('Edit amount')).toBeInTheDocument()
    expect(within(row).getByLabelText('Edit date')).toBeInTheDocument()
    expect(within(row).getByLabelText('Edit category')).toBeInTheDocument()
    expect(within(row).getByRole('combobox')).toHaveValue('other')
    const textboxes = within(row).getAllByRole('textbox')
    await user.clear(textboxes[0])
    await user.type(textboxes[0], '  New Name  ')
    await user.clear(within(row).getByRole('spinbutton'))
    await user.type(within(row).getByRole('spinbutton'), '12.345')
    await user.clear(screen.getByPlaceholderText('Custom Category'))
    await user.type(screen.getByPlaceholderText('Custom Category'), '  Home Repair  ')
    expect(within(row).getByLabelText('Edit custom category')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Save' }))

    expect(updateExpense).toHaveBeenCalledWith(42, {
      id: 42,
      description: 'new name',
      amount: 12.35,
      date: '2026-08-10',
      category: 'home repair',
    })
  })

  it('shows ten matches initially, expands, and resets when filters change', async () => {
    const user = userEvent.setup()
    useExpenses.mockReturnValue({
      ...baseExpensesHook,
      expenses: Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        description: `expense ${index + 1}`,
        amount: index + 1,
        date: '2026-08-01T00:00:00Z',
        category: 'food',
      })),
    })
    render(<TransactionsPage />)

    expect(screen.getByRole('region', { name: 'Expenses table' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('Expenses', { selector: 'caption' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(11)
    await user.click(screen.getByRole('button', { name: 'Show More' }))
    expect(screen.getAllByRole('row')).toHaveLength(13)

    await user.type(screen.getByPlaceholderText('Search description or category...'), 'expense')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(11))
    expect(screen.getByRole('button', { name: 'Show More' })).toBeInTheDocument()
  })

  it('keeps missing-field validation while using neutral copy', async () => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(window.alert).toHaveBeenCalledWith('Complete all transaction fields.')
    expect(baseExpensesHook.addExpense).not.toHaveBeenCalled()
  })

  it('keeps the page transaction-focused without chart or budget-read controls', () => {
    render(<TransactionsPage />)

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Spending vs Budget Limits' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Chart month')).not.toBeInTheDocument()
  })
})
