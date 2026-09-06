import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PlanPage from './PlanPage'

describe('Plan navigation hub', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('links to each established planning workflow without fetching data', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    render(<MemoryRouter><PlanPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Plan', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Budgets',
      'Commitments',
      'Paychecks',
    ])
    expect(screen.getByRole('link', { name: /Budgets/ })).toHaveAttribute('href', '/budgets')
    expect(screen.getByRole('link', { name: /Commitments/ })).toHaveAttribute('href', '/commitments')
    expect(screen.getByRole('link', { name: /Paychecks/ })).toHaveAttribute('href', '/paychecks')
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
