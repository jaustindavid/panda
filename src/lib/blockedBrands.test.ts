import { describe, expect, it } from 'vitest'
import { isBlockedBrand, matchingBlockedBrands } from './blockedBrands.ts'

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

describe('matchingBlockedBrands', () => {
  const blocked = [
    { id: 'walmart', name: 'Walmart' },
    { id: 'starbucks', name: 'Starbucks' },
  ]

  it('returns the one matching entry', () => {
    expect(matchingBlockedBrands('Walmart Supercenter', blocked)).toEqual([
      { id: 'walmart', name: 'Walmart' },
    ])
  })

  it('returns an empty array for an unrelated name', () => {
    expect(matchingBlockedBrands('Baroni’s', blocked)).toEqual([])
  })

  it('returns every entry that matches', () => {
    const overlapping = [
      { id: 'wal', name: 'Wal' },
      { id: 'walmart', name: 'Walmart' },
    ]
    expect(matchingBlockedBrands('Walmart Supercenter', overlapping)).toEqual(
      overlapping,
    )
  })
})
