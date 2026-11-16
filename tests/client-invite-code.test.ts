import { parseClientInviteInput } from '../src/lib/client-invite-code'

describe('parseClientInviteInput', () => {
  it('принимает код и ссылку', () => {
    expect(parseClientInviteInput(' ab3k9z ')).toBe('AB3K9Z')
    expect(parseClientInviteInput('https://fitboddy.test/i/AB3K9Z')).toBe('AB3K9Z')
    expect(parseClientInviteInput('/i/ab3k9z?from=chat')).toBe('AB3K9Z')
  })

  it('отклоняет посторонний текст и похожие символы', () => {
    expect(parseClientInviteInput('')).toBeNull()
    expect(parseClientInviteInput('привет')).toBeNull()
    expect(parseClientInviteInput('AB30K9')).toBeNull()
    expect(parseClientInviteInput('https://fitboddy.test/i/000000')).toBeNull()
  })
})
