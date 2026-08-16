import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Send } from 'lucide-react'

import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { AsyncTextState } from '../shared'

export function MessageComposer({
  disabled = false,
  onSend,
}: {
  disabled?: boolean
  onSend: (body: string) => Promise<void>
}) {
  const [draft, setDraft] = useState('')
  const [failedBody, setFailedBody] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [draft])

  const submit = async (body: string) => {
    const normalized = body.trim()
    if (!normalized || sending || disabled) return
    setDraft('')
    setFailedBody(null)
    setSending(true)
    try {
      await onSend(normalized)
    } catch {
      setFailedBody(normalized)
      setDraft((current) => (current.trim() ? current : normalized))
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      className="shrink-0 border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(draft)
      }}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="message-composer" className="sr-only">
            Сообщение
          </label>
          <Textarea
            ref={textareaRef}
            id="message-composer"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void submit(draft)
              }
            }}
            placeholder="Сообщение"
            disabled={disabled}
            maxLength={4000}
            rows={1}
            className="max-h-40 min-h-12 resize-none overflow-y-auto text-base"
          />
          <div className="mt-1 min-h-4 text-[11px] text-secondary-foreground">
            Enter — отправить, Shift+Enter — новая строка
          </div>
        </div>
        <Button
          type="submit"
          disabled={!draft.trim() || sending || disabled}
          className="mb-5 size-12 shrink-0 px-0 sm:h-12 sm:w-auto sm:px-4"
          aria-label="Отправить"
        >
          <Send size={18} />
          <span className="hidden sm:inline">{sending ? 'Отправка…' : 'Отправить'}</span>
        </Button>
      </div>
      <div aria-live="polite" className="mt-1">
        {failedBody ? (
          <div className="flex items-center justify-between gap-3">
            <AsyncTextState tone="destructive">Не удалось отправить. Текст сохранён.</AsyncTextState>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => void submit(failedBody)}>
              <RotateCcw size={14} />
              Повторить
            </Button>
          </div>
        ) : null}
      </div>
    </form>
  )
}
