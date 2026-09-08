import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthPage from './AuthPage'
import ConfirmEmailPage from './ConfirmEmailPage'
import ResetPasswordPage from './ResetPasswordPage'
import ForgotPasswordPage from './ForgotPasswordPage'
import { authApi } from '../../../shared/api/authApi'

vi.mock('../../../shared/api/authApi', () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    resendConfirmation: vi.fn(),
    confirmEmail: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

function renderAt(ui, initialEntry = '/') {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>)
}

describe('existing authentication flows', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores the login token and email using the existing keys', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    authApi.login.mockResolvedValue({ data: { token: 'jwt-value', email: 'person@example.com' } })
    renderAt(<AuthPage onLogin={onLogin} />)

    expect(screen.getByRole('heading', { name: 'Log in', level: 1 })).toHaveFocus()
    expect(screen.getByText('ordo')).not.toHaveRole('heading')
    expect(screen.getByText('Email', { selector: 'label' })).toBeVisible()
    expect(screen.getByText('Password', { selector: 'label' })).toBeVisible()
    expect(screen.getByLabelText('Email')).toBe(screen.getByPlaceholderText('Email'))
    expect(screen.getByLabelText('Password')).toBe(screen.getByPlaceholderText('Password'))
    await user.type(screen.getByPlaceholderText('Email'), 'person@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'Secret1!')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => expect(onLogin).toHaveBeenCalledOnce())
    expect(localStorage.getItem('token')).toBe('jwt-value')
    expect(localStorage.getItem('email')).toBe('person@example.com')
  })

  it('establishes the session without requiring an App callback', async () => {
    const user = userEvent.setup()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    authApi.login.mockResolvedValue({ data: { token: 'new-synthetic-session', email: 'person@example.invalid' } })
    renderAt(<AuthPage />)
    await user.type(screen.getByLabelText('Email'), 'person@example.invalid')
    await user.type(screen.getByLabelText('Password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    await waitFor(() => expect(localStorage.getItem('token')).toBe('new-synthetic-session'))
    expect(localStorage.getItem('email')).toBe('person@example.invalid')
    expect(alert).not.toHaveBeenCalled()
    alert.mockRestore()
  })

  it('retains the public login 401 message without establishing a session', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    authApi.login.mockRejectedValue({ response: { status: 401, data: 'Invalid credentials' } })
    renderAt(<AuthPage onLogin={onLogin} />)
    await user.type(screen.getByLabelText('Email'), 'person@example.invalid')
    await user.type(screen.getByLabelText('Password'), 'Synthetic1!')
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('Invalid credentials')
    expect(error).toHaveFocus()
    expect(alert).not.toHaveBeenCalled()
    expect(onLogin).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    log.mockRestore()
    alert.mockRestore()
  })

  it('keeps the neutral registration delivery failure and rate-limit presentation', async () => {
    const user = userEvent.setup()
    authApi.register.mockRejectedValue({
      response: {
        data: {
          code: 'confirmation_email_delivery_failed',
          message: "Your account was created, but we couldn't send the confirmation email.",
        },
      },
    })
    authApi.resendConfirmation.mockRejectedValue({ response: { status: 429 } })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    renderAt(<AuthPage onLogin={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    expect(screen.getByRole('heading', { name: 'Create account', level: 1 })).toHaveFocus()
    expect(screen.getByText('Confirm password', { selector: 'label' })).toBeVisible()
    expect(screen.getByLabelText('Confirm password')).toBe(screen.getByPlaceholderText('Confirm Password'))
    await user.type(screen.getByPlaceholderText('Email'), 'person@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'Secret1!')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'Secret1!')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByRole('heading', { name: 'Check your email', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent("Your account was created, but we couldn't send the confirmation email.")
    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests. Please wait before trying again.')
  })

  it('forwards confirmation query parameters unchanged', async () => {
    authApi.confirmEmail.mockResolvedValue({ data: { message: 'ok' } })
    renderAt(<ConfirmEmailPage />, '/confirm-email?userId=user-123&token=a%2Bb_c')

    expect(screen.getByRole('heading', { name: 'Confirming email', level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(authApi.confirmEmail).toHaveBeenCalledWith({
      userId: 'user-123',
      token: 'a+b_c',
    }))
    expect(await screen.findByRole('heading', { name: 'Email confirmed', level: 1 })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('You can now log in.')
  })

  it('does not call confirmation without both required query parameters', async () => {
    renderAt(<ConfirmEmailPage />, '/confirm-email?userId=user-123')
    expect(await screen.findByRole('heading', { name: 'Unable to confirm email', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('invalid, expired, or already used')
    expect(authApi.confirmEmail).not.toHaveBeenCalled()
  })

  it('forwards reset email, token, and new password from the deep link', async () => {
    const user = userEvent.setup()
    authApi.resetPassword.mockResolvedValue({ data: { message: 'ok' } })
    renderAt(<ResetPasswordPage />, '/reset-password?email=person%40example.com&token=reset%2Btoken')

    expect(screen.getByRole('heading', { name: 'Reset password', level: 1 })).toHaveFocus()
    expect(screen.getByText('New password', { selector: 'label' })).toBeVisible()
    expect(screen.getByLabelText('New password')).toBe(screen.getByPlaceholderText('New password'))
    await user.type(screen.getByPlaceholderText('New password'), 'NewSecret1!')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      token: 'reset+token',
      newPassword: 'NewSecret1!',
    }))
  })

  it('presents the forgot-password endpoint neutral response', async () => {
    const user = userEvent.setup()
    authApi.forgotPassword.mockResolvedValue({
      data: { message: 'If the email exists, a reset link was sent.' },
    })
    renderAt(<ForgotPasswordPage />, '/forgot-password')

    expect(screen.getByRole('heading', { name: 'Forgot password', level: 1 })).toHaveFocus()
    expect(screen.getByText('Email', { selector: 'label' })).toBeVisible()
    expect(screen.getByLabelText('Email')).toBe(screen.getByPlaceholderText('Email'))
    await user.type(screen.getByPlaceholderText('Email'), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('If the email exists, a reset link was sent.')
  })

  it('exposes password visibility as a pressed toggle without changing the password', async () => {
    const user = userEvent.setup()
    renderAt(<AuthPage onLogin={vi.fn()} />)

    const password = screen.getByLabelText('Password')
    const reveal = screen.getByRole('button', { name: 'Show password' })
    await user.type(password, 'Secret1!')

    expect(password).toHaveAttribute('type', 'password')
    expect(reveal).toHaveAttribute('aria-pressed', 'false')
    await user.click(reveal)
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Secret1!')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps registration requirements visible and associated with the password field', async () => {
    const user = userEvent.setup()
    renderAt(<AuthPage onLogin={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))

    const password = screen.getByLabelText('Password')
    expect(screen.getByText('Password must include:')).toBeVisible()
    expect(screen.getByText('At least 6 characters')).toBeVisible()
    expect(password).toHaveAccessibleDescription(/At least 6 characters/)
    expect(screen.getByRole('button', { name: 'Show confirm password' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports a password mismatch inline and does not submit registration', async () => {
    const user = userEvent.setup()
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    renderAt(<AuthPage onLogin={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret1!')
    await user.type(screen.getByLabelText('Confirm password'), 'Different1!')
    const registerButton = screen.getByRole('button', { name: 'Register' })
    await user.click(registerButton)

    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('Passwords do not match.')
    expect(error).toHaveFocus()

    registerButton.focus()
    expect(registerButton).toHaveFocus()
    await user.click(registerButton)
    expect(error).toHaveFocus()

    expect(authApi.register).not.toHaveBeenCalled()
    expect(alert).not.toHaveBeenCalled()
    alert.mockRestore()
  })

  it('preserves native required and email validation before login submission', async () => {
    const user = userEvent.setup()
    renderAt(<AuthPage onLogin={vi.fn()} />)

    const email = screen.getByLabelText('Email')
    const password = screen.getByLabelText('Password')
    expect(email).toBeRequired()
    expect(password).toBeRequired()

    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(authApi.login).not.toHaveBeenCalled()

    await user.type(email, 'not-an-email')
    await user.type(password, 'Secret1!')
    expect(email).toBeInvalid()
    await user.click(screen.getByRole('button', { name: 'Log In' }))
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('registers with the existing payload and moves to check-email without establishing a session', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    authApi.register.mockResolvedValue({ data: {} })
    renderAt(<AuthPage onLogin={onLogin} />)

    await user.click(screen.getByRole('button', { name: 'Need an account? Register' }))
    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'Secret1!')
    await user.type(screen.getByLabelText('Confirm password'), 'Secret1!')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(authApi.register).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'Secret1!',
    }))
    expect(await screen.findByRole('heading', { name: 'Check your email', level: 1 })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('A confirmation link was sent to person@example.com.')
    expect(screen.getByText('person@example.com', { selector: 'strong' })).toBeVisible()
    expect(onLogin).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
  })

  it('keeps a confirmation resend result visible after its recovery disclosure closes', async () => {
    const user = userEvent.setup()
    authApi.resendConfirmation.mockResolvedValue({
      data: { message: 'If the account exists, a confirmation email was sent.' },
    })
    renderAt(<ForgotPasswordPage />, '/forgot-password')

    await user.type(screen.getByLabelText('Email'), 'unknown@example.com')
    const recovery = screen.getByText('Need a new confirmation email?', { selector: 'summary' })
    await user.click(recovery)
    await user.click(screen.getByRole('button', { name: 'Resend confirmation email' }))

    await waitFor(() => expect(authApi.resendConfirmation).toHaveBeenCalledWith({
      email: 'unknown@example.com',
    }))
    const result = await screen.findByRole('status')
    expect(result).toHaveTextContent('If the account exists, a confirmation email was sent.')
    await user.click(recovery)
    expect(result).toBeVisible()
  })

  it('keeps reset failure inline with the recovery action available', async () => {
    const user = userEvent.setup()
    authApi.resetPassword.mockRejectedValue(new Error('synthetic failure'))
    renderAt(<ResetPasswordPage />, '/reset-password?email=person%40example.com&token=reset%2Btoken')

    await user.type(screen.getByLabelText('New password'), 'NewSecret1!')
    await user.click(screen.getByRole('button', { name: 'Reset Password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Error resetting password.')
    expect(screen.getByRole('button', { name: 'Back to login' })).toBeVisible()
  })
})
