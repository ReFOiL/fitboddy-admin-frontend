import { fireEvent, render, screen } from '@testing-library/react'

import { AlertBanner, EmptyState, QueryState, Textarea, UnreadBadge } from '../src/components/shared'

describe('shared primitives', () => {
  it('renders badges only for unread messages and caps their label', () => {
    const { rerender } = render(<UnreadBadge count={0} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()

    rerender(<UnreadBadge count={120} max={99} />)
    expect(screen.getByText('99+')).toHaveAttribute('aria-label', '120 непрочитанных')
  })

  it('renders accessible alert and empty states', () => {
    render(
      <>
        <AlertBanner tone="warning" title="Нужны данные" role="alert">
          Заполни профиль
        </AlertBanner>
        <EmptyState title="Нет тренировок" description="Создай первый план" />
      </>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Заполни профиль')
    expect(screen.getByText('Нет тренировок')).toBeInTheDocument()
    expect(screen.getByText('Создай первый план')).toBeInTheDocument()
  })

  it('selects a query fallback before rendering content', () => {
    const { rerender } = render(
      <QueryState isLoading>
        <div>Данные</div>
      </QueryState>,
    )
    expect(screen.getByText('Загрузка…')).toBeInTheDocument()

    rerender(
      <QueryState isError>
        <div>Данные</div>
      </QueryState>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить данные')

    rerender(
      <QueryState isEmpty>
        <div>Данные</div>
      </QueryState>,
    )
    expect(screen.getByText('Здесь пока ничего нет')).toBeInTheDocument()

    rerender(<QueryState><div>Данные</div></QueryState>)
    expect(screen.getByText('Данные')).toBeInTheDocument()
  })

  it('даёт повторить ошибочный запрос', () => {
    const onRetry = vi.fn()
    render(
      <QueryState isError errorTitle="Не удалось загрузить тренировки" onRetry={onRetry}>
        <div>Данные</div>
      </QueryState>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('forwards textarea attributes and ref-compatible behavior', () => {
    render(<Textarea aria-label="Комментарий" placeholder="Напиши сообщение" />)
    expect(screen.getByRole('textbox', { name: 'Комментарий' })).toHaveAttribute(
      'placeholder',
      'Напиши сообщение',
    )
  })
})
