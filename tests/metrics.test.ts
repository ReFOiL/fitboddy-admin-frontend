import { formatMetricCount, formatMetricPercent } from '../src/lib/metrics'

describe('числа аналитики', () => {
  it('форматирует проценты так, как их отдаёт сервер', () => {
    expect(formatMetricPercent(33.3)).toBe('33,3 %')
    expect(formatMetricPercent(75)).toBe('75 %')
    expect(formatMetricCount(4)).toBe('4')
  })
})
