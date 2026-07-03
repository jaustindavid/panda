import { describe, expect, it } from 'vitest'
import { isBlockedBrand } from './blockedBrands.ts'

describe('isBlockedBrand', () => {
  const blocked = [
    { id: 'walmart', name: 'Walmart' },
    { id: 'starbucks', name: 'Starbucks' },
  ]

  it('matches a place name containing a blocked chain', () => {
    expect(isBlockedBrand('Walmart Supercenter', blocked)).toBe(true)
    expect(isBlockedBrand('Starbucks Reserve', blocked)).toBe(true)
  })

  it('matches a chain sub-place Google tags separately (e.g. the bakery counter)', () => {
    expect(isBlockedBrand('Walmart Bakery', blocked)).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isBlockedBrand('WALMART NEIGHBORHOOD MARKET', blocked)).toBe(true)
  })

  it('does not match an unrelated name', () => {
    expect(isBlockedBrand('Baroni’s', blocked)).toBe(false)
  })

  it('returns false when nothing is blocked', () => {
    expect(isBlockedBrand('Walmart Supercenter', [])).toBe(false)
  })
})
