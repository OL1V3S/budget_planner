import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import SettingsPage from './SettingsPage'
import { ThemeProvider } from '../../shared/theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '../../shared/theme/theme'

describe('Settings supported account and appearance behavior', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('shows read-only account identity without account-management controls', () => {
    render(<ThemeProvider><SettingsPage email="person@example.com" /></ThemeProvider>)

    expect(screen.getByText('person@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses the existing theme preference and persistence behavior', async () => {
    const user = userEvent.setup()
    render(<ThemeProvider><SettingsPage email="person@example.com" /></ThemeProvider>)
    const control = screen.getByRole('combobox', { name: 'Theme preference' })

    expect(control).toHaveValue('system')
    expect(screen.getByText(/stored locally on this device/)).toBeInTheDocument()

    await user.selectOptions(control, 'dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    await user.selectOptions(control, 'system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })
})
