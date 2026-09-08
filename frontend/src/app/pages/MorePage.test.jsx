import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MorePage from './MorePage'

describe('More navigation hub', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('puts Settings first and keeps the Investing placeholder subordinate and explicit', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(<MemoryRouter><MorePage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'More', level: 1 })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/settings', '/investing'])
    const investingLink = screen.getByRole('link', { name: /Investing/ })
    expect(investingLink).toHaveAttribute('href', '/investing')
    expect(investingLink).toHaveTextContent(/unavailable/i)
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('href', '/settings')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
