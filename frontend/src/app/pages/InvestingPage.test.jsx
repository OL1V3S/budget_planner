import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InvestingPage from './InvestingPage'

describe('Investing unavailable surface', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('describes only unconnected, unavailable, source-neutral future domains', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(<InvestingPage />)

    expect(screen.getByRole('heading', { name: 'No investment source connected' })).toBeInTheDocument()
    expect(screen.getByText(/No investment data is being fetched, imported, inferred, or evaluated/)).toBeInTheDocument()

    const capabilities = screen.getByRole('heading', { name: 'Planned capability areas' }).closest('section')
    expect(within(capabilities).getByRole('heading', { name: 'Connections' })).toBeInTheDocument()
    expect(within(capabilities).getByRole('heading', { name: 'Portfolio and positions' })).toBeInTheDocument()
    expect(within(capabilities).getByRole('heading', { name: 'Signals' })).toBeInTheDocument()
    expect(within(capabilities).getByRole('heading', { name: 'Activity and performance' })).toBeInTheDocument()
    expect(within(capabilities).getAllByText('Not available')).toHaveLength(4)
    expect(screen.getByText(/source-specific adapter and a normalized application contract/)).toBeInTheDocument()
    expect(screen.getByText(/No provider is supported today/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
