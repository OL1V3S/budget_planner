import { describe, expect, it } from 'vitest'
import { usedPercentage } from './budgets'

describe('budget percentage', () => {
  it('calculates usage without capping over-budget values', () => {
    expect(usedPercentage(90, 100)).toBe(90)
    expect(usedPercentage(125, 100)).toBe(125)
  })

  it('returns zero when no usable limit exists', () => {
    expect(usedPercentage(50, 0)).toBe(0)
    expect(usedPercentage(50, '')).toBe(0)
  })
})
