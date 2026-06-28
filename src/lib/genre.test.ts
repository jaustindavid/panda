import { describe, expect, it } from 'vitest'
import { genreLabel, humanizeType } from './genre.ts'

describe('humanizeType', () => {
  it('strips _restaurant and title-cases', () => {
    expect(humanizeType('italian_restaurant')).toBe('Italian')
    expect(humanizeType('sushi_restaurant')).toBe('Sushi')
  })
  it('keeps non-restaurant food types readable', () => {
    expect(humanizeType('hot_dog_stand')).toBe('Hot Dog Stand')
    expect(humanizeType('meal_takeaway')).toBe('Meal Takeaway')
  })
  it('falls back to "Restaurant" for the bare type', () => {
    expect(humanizeType('restaurant')).toBe('Restaurant')
  })
})

describe('genreLabel', () => {
  it('prefers the primary type', () => {
    expect(
      genreLabel({ primaryType: 'mexican_restaurant', types: ['restaurant'] }),
    ).toBe('Mexican')
  })
  it('falls back to a *_restaurant in types', () => {
    expect(
      genreLabel({ types: ['thai_restaurant', 'restaurant', 'food'] }),
    ).toBe('Thai')
  })
  it('handles the generic case', () => {
    expect(genreLabel({ primaryType: 'restaurant', types: ['restaurant'] })).toBe(
      'Restaurant',
    )
  })
})
