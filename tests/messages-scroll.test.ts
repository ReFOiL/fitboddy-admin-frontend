import { isNearChatBottom } from '../src/lib/messages-scroll'

describe('messages scroll helper', () => {
  it('detects whether a user is close enough to the bottom for autoscroll', () => {
    expect(isNearChatBottom({ scrollHeight: 1000, scrollTop: 780, clientHeight: 200 })).toBe(true)
    expect(isNearChatBottom({ scrollHeight: 1000, scrollTop: 500, clientHeight: 200 })).toBe(false)
    expect(isNearChatBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 200 }, 100)).toBe(true)
  })
})
