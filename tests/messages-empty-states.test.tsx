import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { EmptyThreadPane, StartChatPanel } from '../src/components/messages/StartChatStates'

describe('message empty states', () => {
  it('guides a client without a trainer to relations', () => {
    render(
      <MemoryRouter>
        <StartChatPanel
          peers={[]}
          peersLoading={false}
          relationsPath="/trainers"
          isTrainer={false}
          pending={false}
          onStart={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Пока некому написать')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'К тренерам' })).toHaveAttribute('href', '/trainers')
  })

  it('offers the only available peer from an empty desktop pane', () => {
    const onStart = vi.fn()
    render(
      <MemoryRouter>
        <EmptyThreadPane
          peers={[{ userId: 'trainer-1', title: 'Анна Тренер' }]}
          peersLoading={false}
          hasConversations={false}
          relationsPath="/trainers"
          isTrainer={false}
          pending={false}
          onStart={onStart}
        />
      </MemoryRouter>,
    )

    screen.getByRole('button', { name: 'Написать тренеру' }).click()
    expect(onStart).toHaveBeenCalledWith('trainer-1')
  })
})
