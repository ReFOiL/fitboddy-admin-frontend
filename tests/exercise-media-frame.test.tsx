import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExerciseHeroMedia, SlotPhotoPreview } from '../src/components/media/ExerciseMedia'
import { ExerciseThumb } from '../src/components/ui/kit'

describe('exercise photo frames', () => {
  it('shows client start and end photos in fixed 4:3 cover frames', () => {
    render(
      <ExerciseHeroMedia
        startUrl="https://cdn.example.test/start.jpg"
        endUrl="https://cdn.example.test/end.jpg"
      />,
    )

    for (const alt of ['Старт', 'Финиш']) {
      const photo = screen.getByAltText(alt)
      expect(photo).toHaveClass('object-cover', 'object-center')
      expect(photo.parentElement).toHaveAttribute('data-aspect', '4/3')
      expect(photo.parentElement).toHaveClass('aspect-[4/3]')
      expect(photo.className).not.toContain('4/5')
      expect(photo.parentElement?.className).not.toContain('4/5')
    }
  })

  it('uses the same 4:3 frame when only one photo or none is present', () => {
    const { rerender } = render(<ExerciseHeroMedia startUrl="https://cdn.example.test/start.jpg" />)
    const photo = screen.getByAltText('Старт')
    expect(photo.parentElement).toHaveAttribute('data-aspect', '4/3')
    expect(screen.getByText('Нет фото: Финиш')).toBeInTheDocument()

    rerender(<ExerciseHeroMedia />)
    expect(screen.getByText('Фото положения').parentElement).toHaveClass('aspect-[4/3]')
    expect(screen.getByText('Фото положения').parentElement?.className).not.toContain('4/5')
  })

  it('keeps video at its own aspect and does not stretch it into the photo frame', () => {
    const { container } = render(
      <ExerciseHeroMedia videoUrl="https://cdn.example.test/move.mp4" startUrl="https://cdn.example.test/start.jpg" />,
    )
    expect(container.querySelector('video')).toHaveClass('aspect-video')
    expect(screen.queryByAltText('Старт')).not.toBeInTheDocument()
  })

  it('covers the plan-slot preview inside 4:3', () => {
    const { container } = render(<SlotPhotoPreview startUrl="https://cdn.example.test/start.jpg" endUrl={null} />)
    const photo = container.querySelector('img')
    expect(photo).toHaveClass('object-cover', 'object-center')
    expect(photo?.parentElement).toHaveAttribute('data-aspect', '4/3')
    expect(screen.getByText('Нет фото: Финиш')).toBeInTheDocument()
  })

  it('uses a 4:3 catalog thumb', () => {
    const { container } = render(<ExerciseThumb imageUrl="https://cdn.example.test/start.jpg" />)
    const photo = container.querySelector('img')
    expect(photo).toHaveClass('object-cover', 'object-center')
    expect(photo?.parentElement).toHaveAttribute('data-aspect', '4/3')
    expect(photo?.parentElement).toHaveClass('aspect-[4/3]', 'h-12', 'w-16')
    expect(photo?.parentElement).not.toHaveClass('w-full')
  })
})