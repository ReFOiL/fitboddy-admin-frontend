import { trainerFacingName } from '../src/lib/person'

describe('trainerFacingName', () => {
  it('предпочитает имя и оставляет логин запасным', () => {
    expect(trainerFacingName({ displayName: 'Марина Соколова', login: 'marina.sokolova' })).toBe('Марина Соколова')
    expect(trainerFacingName({ displayName: '  ', login: 'marina.sokolova' })).toBe('marina.sokolova')
    expect(trainerFacingName({ login: '  ' })).toBe('Тренер')
  })
})
