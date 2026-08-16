import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { MessageComposer } from '../src/components/messages/MessageComposer'

describe('MessageComposer', () => {
  it('restores the draft and retries a failed send', async () => {
    const onSend = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined)
    render(<MessageComposer onSend={onSend} />)

    const composer = screen.getByRole('textbox', { name: 'Сообщение' })
    fireEvent.change(composer, { target: { value: 'Сообщение для повтора' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Не удалось отправить. Текст сохранён.')).toBeInTheDocument()
    expect(composer).toHaveValue('Сообщение для повтора')

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(2))
    expect(onSend).toHaveBeenLastCalledWith('Сообщение для повтора')
    await waitFor(() => expect(screen.queryByText('Не удалось отправить. Текст сохранён.')).not.toBeInTheDocument())
  })

  it('uses Enter to send and Shift+Enter for multiline text', () => {
    const onSend = vi.fn().mockResolvedValue(undefined)
    render(<MessageComposer onSend={onSend} />)
    const composer = screen.getByRole('textbox', { name: 'Сообщение' })

    fireEvent.change(composer, { target: { value: 'Первая строка' } })
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.keyDown(composer, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('Первая строка')
  })
})
