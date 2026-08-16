import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ThemeProvider } from '../shared/theme/ThemeProvider'

vi.mock('../features/transactions/pages/TransactionsPage', () => ({
  default: () => <h1>Transactions workspace</h1>,
}))

vi.mock('../features/auth/components/AuthPage', () => ({
  default: () => <h1>Authentication content</h1>,
}))

vi.mock('../features/auth/components/ConfirmEmailPage', () => ({
  default: () => <h1>Confirmation content</h1>,
}))

vi.mock('../features/auth/components/ForgotPasswordPage', () => ({
  default: () => <h1>Forgot password content</h1>,
}))

vi.mock('../features/auth/components/ResetPasswordPage', () => ({
  default: () => <h1>Reset password content</h1>,
}))

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <App />
        <LocationProbe />
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('application routes and shell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('shows the existing authentication experience at the root without a token', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Authentication content' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })

  it('redirects an authenticated root visit to overview', async () => {
    localStorage.setItem('token', 'jwt-value')
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/overview')
  })

  it('redirects a protected route to authentication without a token', async () => {
    renderAt('/transactions')
    expect(await screen.findByRole('heading', { name: 'Authentication content' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it.each([
    ['/overview', 'Welcome back'],
    ['/transactions', 'Transactions workspace'],
    ['/budgets', 'Budgets'],
    ['/analytics', 'Analytics'],
    ['/investing', 'Investing'],
    ['/settings', 'Settings'],
  ])('supports direct authenticated navigation to %s', async (path, heading) => {
    localStorage.setItem('token', 'jwt-value')
    localStorage.setItem('email', 'person@example.com')
    renderAt(path)
    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument()
  })

  it('marks the current destination in desktop and mobile navigation', () => {
    localStorage.setItem('token', 'jwt-value')
    renderAt('/transactions')
    const currentLinks = screen.getAllByRole('link', { name: /Transactions/ })
    expect(currentLinks).toHaveLength(2)
    currentLinks.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'))
  })

  it('exposes five primary destinations in mobile navigation and keeps Settings directly reachable', () => {
    localStorage.setItem('token', 'jwt-value')
    renderAt('/overview')
    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(navigation).toBeInTheDocument()
    expect(navigation.querySelectorAll('a')).toHaveLength(5)
    expect(screen.getAllByRole('link', { name: /Settings/ })).toHaveLength(2)
  })

  it('clears the existing auth keys and returns to authentication on logout', async () => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    localStorage.setItem('email', 'person@example.com')
    renderAt('/overview')

    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Authentication content' })).toBeInTheDocument()
  })

  it('exposes account identity and logout through the mobile account menu', async () => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    localStorage.setItem('email', 'person@example.com')
    renderAt('/overview')

    const accountMenu = screen.getByRole('button', { name: 'Account menu' })
    expect(accountMenu).toHaveAttribute('aria-expanded', 'false')
    expect(accountMenu).toHaveAttribute('aria-controls', 'mobile-account-options')
    await user.click(accountMenu)

    expect(accountMenu).toHaveAttribute('aria-expanded', 'true')
    const accountOptions = screen.getByRole('group', { name: 'Account options' })
    expect(accountOptions).toHaveTextContent('person@example.com')
    await user.click(within(accountOptions).getByRole('button', { name: 'Logout' }))

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    expect(await screen.findByRole('heading', { name: 'Authentication content' })).toBeInTheDocument()
  })

  it('dismisses the mobile account menu with Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    renderAt('/overview')

    const accountMenu = screen.getByRole('button', { name: 'Account menu' })
    await user.click(accountMenu)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('group', { name: 'Account options' })).not.toBeInTheDocument()
    expect(accountMenu).toHaveFocus()
  })

  it.each([
    ['/confirm-email?userId=user-123&token=value', 'Confirmation content'],
    ['/forgot-password', 'Forgot password content'],
    ['/reset-password?email=person%40example.com&token=value', 'Reset password content'],
  ])('keeps public recovery route %s outside the shell', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
  })

  it('keeps theme selection functional in the shell header', async () => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    renderAt('/settings')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('budget-planner-theme')).toBe('dark')
  })

  it('renders the honest Investing surface without starting an integration request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    localStorage.setItem('token', 'jwt-value')
    renderAt('/investing')
    expect(screen.getByRole('heading', { name: 'Not connected yet' })).toBeInTheDocument()
    await waitFor(() => expect(fetchSpy).not.toHaveBeenCalled())
  })

  it.each([
    ['/budgets', 'Open budget limits'],
    ['/analytics', 'Open spending chart'],
  ])('keeps %s compatibility functionality reachable through Transactions', async (path, actionLabel) => {
    const user = userEvent.setup()
    localStorage.setItem('token', 'jwt-value')
    renderAt(path)

    await user.click(screen.getByRole('link', { name: actionLabel }))

    expect(await screen.findByRole('heading', { name: 'Transactions workspace' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/transactions')
  })
})
