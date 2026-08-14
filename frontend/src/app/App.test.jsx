import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('../features/expenses/components/ExpensesPage', () => ({
  default: () => <div>Expenses content</div>,
}))

vi.mock('../features/auth/components/AuthPage', () => ({
  default: () => <div>Authentication content</div>,
}))

describe('current root authentication behavior', () => {
  beforeEach(() => localStorage.clear())

  it('shows authentication at the root when no token exists', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('Authentication content')).toBeInTheDocument()
  })

  it('shows expenses for a stored token and clears token and email on logout', async () => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    localStorage.setItem('email', 'person@example.com')
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)

    expect(screen.getByText('Expenses content')).toBeInTheDocument()
    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    expect(screen.getByText('Authentication content')).toBeInTheDocument()
  })
})
