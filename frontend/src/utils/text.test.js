import { describe, expect, it } from 'vitest'
import { displayText, isDefaultCategory, normalizeText } from './text'

describe('text normalization used by expense and budget writes', () => {
  it('trims and lowercases values before they are sent', () => {
    expect(normalizeText('  Dinner With Friends  ')).toBe('dinner with friends')
    expect(normalizeText('  FOOD ')).toBe('food')
  })

  it('recognizes default categories without depending on case', () => {
    const defaults = ['Food', 'Transport', 'Bills', 'Entertainment']

    expect(isDefaultCategory(' FOOD ', defaults)).toBe(true)
    expect(isDefaultCategory('medical', defaults)).toBe(false)
  })

  it('keeps display formatting separate from stored normalization', () => {
    expect(displayText('home   repairs')).toBe('Home Repairs')
  })
})
