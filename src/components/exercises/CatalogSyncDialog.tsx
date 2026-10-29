import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Check, ChevronDown, Info, Minus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { applyTrainerCatalogSync, previewTrainerCatalogSync } from '../../api/exercises'
import { queryKeys } from '../../api/queryKeys'
import {
  catalogSyncSelectionCount,
  checkState,
  slotsForChangedFields,
  formatCatalogSyncSuccessDescription,
  formatSyncSummary,
  initialCatalogSyncSelection,
  mediaSlotCaption,
  mediaSlotMissing,
  mediaSlotUrl,
  syncSummaryParts,
  toCatalogSyncApplyRequest,
  toggleListedId,
  toggleSelectAll,
  withMediaToggle,
  type CatalogSyncAddItem,
  type CatalogSyncPreview,
  type CatalogSyncSelection,
  type CatalogSyncSkipItem,
  type CatalogSyncUpdateItem,
  type MediaSlot,
} from '../../lib/catalog-sync'
import { resolveExerciseMediaUrl } from '../../lib/exercise-photos'
import { CATALOG_THUMB_SRC, VIDEO_PLACEHOLDER_SRC } from '../../lib/media-placeholders'
import { getUserErrorMessage } from '../../lib/user-error-message'
import { cn } from '../../lib/utils'
import { EmptyState, QueryState } from '../shared'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'

const VISIBLE_MUSCLE_CHIPS = 3

type CatalogSyncDialogProps = {
  trainerUserId: string
  onClose: () => void
}

export function CatalogSyncDialog({ trainerUserId, onClose }: CatalogSyncDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const applyingRef = useRef(false)
  const queryClient = useQueryClient()
  const [customSelection, setCustomSelection] = useState<CatalogSyncSelection | null>(null)
  const previewQuery = useQuery({
    queryKey: queryKeys.exercises.catalogSyncPreview(trainerUserId),
    queryFn: () => previewTrainerCatalogSync(trainerUserId),
    retry: false,
    // Предпросмотр всегда свежий: после apply или правок каталога старый ответ неверен.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })
  const applyMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toCatalogSyncApplyRequest>) =>
      applyTrainerCatalogSync(trainerUserId, payload),
    onSuccess: () => {
      const catalogPrefix = queryKeys.exercises.trainerCatalog(trainerUserId, false).slice(0, -1)
      const exercisePrefix = queryKeys.exercises.trainerExercise(trainerUserId, '').slice(0, -1)
      void queryClient.invalidateQueries({ queryKey: catalogPrefix })
      void queryClient.invalidateQueries({ queryKey: exercisePrefix })
      queryClient.removeQueries({ queryKey: queryKeys.exercises.catalogSyncPreview(trainerUserId) })
    },
  })

  const preview = previewQuery.data
  const selection = customSelection ?? (preview ? initialCatalogSyncSelection(preview) : null)
  const pending = applyMutation.isPending
  const selectedCount = preview && selection ? catalogSyncSelectionCount(preview, selection) : 0
  const canApply = Boolean(preview && selection && selectedCount > 0 && !pending && !previewQuery.isError)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || pending) return
      onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, pending])

  const requestClose = () => {
    if (pending) return
    onClose()
  }

  const updateSelection = (updater: (current: CatalogSyncSelection) => CatalogSyncSelection) => {
    if (!preview) return
    setCustomSelection((current) => updater(current ?? initialCatalogSyncSelection(preview)))
  }

  const apply = async () => {
    if (applyingRef.current || !preview || !selection || !canApply) return
    applyingRef.current = true
    const payload = toCatalogSyncApplyRequest(preview, selection)
    try {
      const result = await applyMutation.mutateAsync(payload)
      const description = formatCatalogSyncSuccessDescription(result.added_count, result.updated_count)
      toast.success('Каталог синхронизирован', description ? { description } : undefined)
      onClose()
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Не удалось синхронизировать каталог.'))
    } finally {
      applyingRef.current = false
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-overlay md:items-center md:p-6"
      role="presentation"
      onClick={requestClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-xl outline-none md:h-[min(860px,calc(100dvh-3rem))] md:max-w-[920px] md:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pt-4 md:px-6">
          <h2 id={titleId} className="text-[22px] font-bold leading-tight">
            Синхронизация с системной базой
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            className="flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-50"
            onClick={requestClose}
            disabled={pending}
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
          <QueryState
            isLoading={previewQuery.isPending}
            isError={previewQuery.isError}
            errorTitle="Не удалось загрузить предпросмотр"
            errorDescription={getUserErrorMessage(previewQuery.error, 'Попробуйте ещё раз.')}
            onRetry={() => {
              void previewQuery.refetch()
            }}
            loadingFallback={
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
            }
          >
            {preview && selection ? (
              <SyncPreview
                preview={preview}
                selection={selection}
                disabled={pending}
                onToggleMedia={() => {
                  updateSelection((current) =>
                    withMediaToggle(
                      current,
                      !current.includeMedia,
                      preview.update.map((item) => item.id),
                    ),
                  )
                }}
                onToggleAdd={(id) => {
                  updateSelection((current) => ({ ...current, addIds: toggleListedId(current.addIds, id) }))
                }}
                onToggleAllAdd={() => {
                  updateSelection((current) => ({
                    ...current,
                    addIds: toggleSelectAll(
                      preview.add.map((item) => item.id),
                      current.addIds,
                    ),
                  }))
                }}
                onToggleUpdate={(id) => {
                  updateSelection((current) => ({ ...current, updateIds: toggleListedId(current.updateIds, id) }))
                }}
                onToggleAllUpdate={() => {
                  updateSelection((current) => ({
                    ...current,
                    updateIds: toggleSelectAll(
                      preview.update.map((item) => item.id),
                      current.updateIds,
                    ),
                  }))
                }}
              />
            ) : null}
          </QueryState>
        </div>

        <footer className="flex shrink-0 gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6">
          <Button type="button" variant="secondary" className="h-12 shrink-0 px-5" onClick={requestClose} disabled={pending}>
            Отмена
          </Button>
          <Button
            type="button"
            className="h-auto min-h-12 min-w-0 flex-1 whitespace-normal px-3 py-2 text-center text-[15px] leading-tight sm:text-[17px]"
            disabled={!canApply}
            onClick={() => {
              void apply()
            }}
          >
            {pending ? 'Синхронизируем…' : `Синхронизировать выбранное (${selectedCount})`}
          </Button>
        </footer>
      </div>
    </div>
  )
}

function SyncPreview({
  preview,
  selection,
  disabled,
  onToggleMedia,
  onToggleAdd,
  onToggleAllAdd,
  onToggleUpdate,
  onToggleAllUpdate,
}: {
  preview: CatalogSyncPreview
  selection: CatalogSyncSelection
  disabled: boolean
  onToggleMedia: () => void
  onToggleAdd: (id: string) => void
  onToggleAllAdd: () => void
  onToggleUpdate: (id: string) => void
  onToggleAllUpdate: () => void
}) {
  const parts = syncSummaryParts(preview.summary)
  const nothingToSync = preview.add.length === 0 && preview.update.length === 0
  const sections: Array<'add' | 'update' | 'skip'> = []
  if (preview.add.length > 0) sections.push('add')
  if (preview.update.length > 0) sections.push('update')
  if (preview.unchanged_count > 0) sections.push('skip')
  const sectionNumber = (id: 'add' | 'update' | 'skip') => sections.indexOf(id) + 1

  return (
    <div className="space-y-4">
      <div role="status" aria-label={formatSyncSummary(preview.summary)}>
        <p className="rounded-2xl border border-border bg-secondary/40 px-3 py-2 text-[14px] text-secondary-foreground md:hidden">
          {formatSyncSummary(preview.summary)}
        </p>
        <div className="hidden flex-wrap gap-2 md:flex">
          <SummaryPill className="bg-success/15 text-success">{parts.added}</SummaryPill>
          <SummaryPill className="bg-primary/15 text-accent-ink">{parts.media}</SummaryPill>
          <SummaryPill className="bg-secondary text-secondary-foreground">{parts.unchanged}</SummaryPill>
        </div>
      </div>

      {preview.update.length > 0 ? (
        <button
          type="button"
          role="switch"
          aria-checked={selection.includeMedia}
          disabled={disabled}
          className="flex min-h-14 w-full items-center justify-between gap-3 text-left disabled:opacity-60"
          onClick={onToggleMedia}
        >
          <span className="text-[17px]">Также подтянуть медиа из системы</span>
          <span
            aria-hidden
            className={cn(
              'flex h-8 w-14 shrink-0 items-center rounded-full border px-1',
              selection.includeMedia ? 'border-primary bg-primary' : 'border-border bg-secondary',
            )}
          >
            <span
              className={cn(
                'h-6 w-6 rounded-full',
                selection.includeMedia ? 'ml-auto bg-primary-foreground' : 'bg-card',
              )}
            />
          </span>
        </button>
      ) : null}

      {nothingToSync ? (
        <EmptyState title="Нечего синхронизировать" description="Каталог уже совпадает с системной базой." />
      ) : null}

      {preview.add.length > 0 ? (
        <WorkingSection
          title={sectionTitle(sectionNumber('add'), 'Добавить', preview.add.length)}
          selected={preview.add.filter((item) => selection.addIds.includes(item.id)).length}
          defaultOpen
        >
          <SelectAllRow
            label="Отметить все в разделе «Добавить»"
            allIds={preview.add.map((item) => item.id)}
            selectedIds={selection.addIds}
            disabled={disabled}
            onToggle={onToggleAllAdd}
          />
          {preview.add.map((item) => (
            <AddCard
              key={item.id}
              item={item}
              selected={selection.addIds.includes(item.id)}
              disabled={disabled}
              onToggle={() => onToggleAdd(item.id)}
            />
          ))}
        </WorkingSection>
      ) : null}

      {preview.update.length > 0 ? (
        <WorkingSection
          title={sectionTitle(sectionNumber('update'), 'Обновить', preview.update.length)}
          selected={selection.includeMedia ? preview.update.filter((item) => selection.updateIds.includes(item.id)).length : 0}
          defaultOpen
        >
          {/* Карточки видны всегда; без «подтягивания медиа» они только недоступны для выбора. */}
          {selection.includeMedia ? null : (
            <p className="text-[15px] text-secondary-foreground">
              Включите подтягивание медиа, чтобы выбрать эти обновления.
            </p>
          )}
          <SelectAllRow
            label="Отметить все в разделе «Обновить»"
            allIds={preview.update.map((item) => item.id)}
            selectedIds={selection.includeMedia ? selection.updateIds : []}
            disabled={disabled || !selection.includeMedia}
            onToggle={onToggleAllUpdate}
          />
          {preview.update.map((item) => (
            <UpdateCard
              key={item.id}
              item={item}
              selected={selection.includeMedia && selection.updateIds.includes(item.id)}
              disabled={disabled || !selection.includeMedia}
              onToggle={() => onToggleUpdate(item.id)}
            />
          ))}
        </WorkingSection>
      ) : null}

      {preview.unchanged_count > 0 ? (
        <SkipSection items={preview.unchanged} count={preview.unchanged_count} number={sectionNumber('skip')} />
      ) : null}
    </div>
  )
}

function SummaryPill({ className, children }: { className: string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-[14px] font-semibold', className)}>{children}</span>
}

function sectionTitle(number: number, label: string, count: number) {
  return (
    <>
      <span className="hidden md:inline">{number}) </span>
      {label} · {count}
    </>
  )
}

function WorkingSection({
  title,
  selected,
  defaultOpen,
  children,
}: {
  title: ReactNode
  selected: number
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="md:rounded-3xl md:border md:border-border md:bg-background md:p-4">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="flex items-center gap-1 text-[14px] font-medium text-secondary-foreground">
          выбрано {selected}
          <ChevronDown size={18} className={cn('shrink-0 transition', open && 'rotate-180')} aria-hidden />
        </span>
      </button>
      {open ? <div className="mt-2 space-y-2">{children}</div> : null}
    </section>
  )
}

function SkipSection({ items, count, number }: { items: CatalogSyncSkipItem[]; count: number; number: number }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="md:rounded-3xl md:border md:border-border md:bg-background md:p-4">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-[17px] font-semibold">{sectionTitle(number, 'Пропустить', count)}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-secondary-foreground transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <p className="pb-2 text-[15px] text-secondary-foreground">
          Эти упражнения уже совпадают с системной базой и не изменятся.
        </p>
      ) : null}
      {open && items.length > 0 ? (
        <ul className="space-y-1 pb-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card px-3 py-2 text-[15px]">
              {item.exercise_name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function SelectAllRow({
  label,
  allIds,
  selectedIds,
  disabled,
  onToggle,
}: {
  label: string
  allIds: string[]
  selectedIds: string[]
  disabled: boolean
  onToggle: () => void
}) {
  const state = checkState(allIds, selectedIds)
  return (
    <CheckRow
      label={label}
      checked={state === 'all'}
      indeterminate={state === 'some'}
      disabled={disabled}
      className="rounded-2xl border border-border bg-card px-3"
      onChange={onToggle}
    >
      <span className="text-[17px] font-semibold">Отметить все</span>
    </CheckRow>
  )
}

function AddCard({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: CatalogSyncAddItem
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const muscles = item.muscles.slice(0, VISIBLE_MUSCLE_CHIPS)
  const extra = item.muscles.length - muscles.length
  return (
    <CheckRow
      label={item.exercise_name}
      checked={selected}
      disabled={disabled}
      box="end"
      className="rounded-2xl border border-border bg-card p-3"
      onChange={onToggle}
    >
      <SyncThumb imageUrl={item.start_image_url} />
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold">{item.exercise_name}</span>
        {muscles.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {muscles.map((muscle) => (
              <span
                key={muscle}
                className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[12px]"
              >
                {muscle}
              </span>
            ))}
            {extra > 0 ? (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[12px] text-secondary-foreground">
                +{extra}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </CheckRow>
  )
}

function UpdateCard({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: CatalogSyncUpdateItem
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const slots = slotsForChangedFields(item.changed_fields)
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <CheckRow label={item.exercise_name} checked={selected} disabled={disabled} onChange={onToggle}>
        <span className="min-w-0 flex-1 text-[17px] font-semibold">{item.exercise_name}</span>
      </CheckRow>
      {slots.length > 0 ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <MediaColumn title="У тебя" tone="yours" media={item.yours} slots={slots} />
          <MediaColumn title="В системе" tone="system" media={item.system} slots={slots} note={item.changes.join(' · ')} />
        </div>
      ) : null}
      {slots.length === 0 && item.changes.length > 0 ? (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] text-accent-ink">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{item.changes.join(' · ')}</span>
        </p>
      ) : null}
    </div>
  )
}

function MediaColumn({
  title,
  tone,
  media,
  slots,
  note,
}: {
  title: string
  tone: 'yours' | 'system'
  media: CatalogSyncUpdateItem['yours']
  slots: MediaSlot[]
  note?: string
}) {
  return (
    <div className={cn('rounded-2xl p-3', tone === 'system' ? 'bg-primary/10' : 'bg-secondary/50')}>
      <p className={cn('text-[13px] font-semibold', tone === 'system' ? 'text-accent-ink' : 'text-secondary-foreground')}>{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <DiffFrame key={slot} slot={slot} url={mediaSlotUrl(media, slot)} />
        ))}
      </div>
      {note ? (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] text-accent-ink">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  )
}

function DiffFrame({ slot, url }: { slot: MediaSlot; url: string | null }) {
  const caption = mediaSlotCaption(slot)
  if (!url) {
    return (
      <div className="flex h-24 w-[4.5rem] items-center justify-center rounded-xl border border-dashed border-border px-1 text-center text-[11px] leading-tight text-secondary-foreground">
        {mediaSlotMissing(slot)}
      </div>
    )
  }
  if (slot === 'video') {
    return (
      <figure className="w-[4.5rem]">
        <span className="relative block h-24 overflow-hidden rounded-xl bg-secondary">
          <img src={VIDEO_PLACEHOLDER_SRC} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80">
              <span className="ml-0.5 border-y-[5px] border-l-[8px] border-y-transparent border-l-foreground" />
            </span>
          </span>
        </span>
        <figcaption className="mt-1 text-center text-[11px] text-secondary-foreground">{caption}</figcaption>
      </figure>
    )
  }
  return (
    <figure className="w-[4.5rem]">
      <img src={resolveExerciseMediaUrl(url) ?? CATALOG_THUMB_SRC} alt="" className="h-24 w-[4.5rem] rounded-xl object-cover" />
      <figcaption className="mt-1 text-center text-[11px] text-secondary-foreground">{caption}</figcaption>
    </figure>
  )
}

function SyncThumb({ imageUrl }: { imageUrl: string | null }) {
  const src = resolveExerciseMediaUrl(imageUrl) ?? CATALOG_THUMB_SRC
  return (
    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
      <img src={src} alt="" className="h-full w-full object-cover" />
    </span>
  )
}

function CheckRow({
  label,
  checked,
  indeterminate = false,
  disabled = false,
  box = 'start',
  className,
  onChange,
  children,
}: {
  label: string
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  box?: 'start' | 'end'
  className?: string
  onChange: () => void
  children: ReactNode
}) {
  const face = <CheckFace checked={checked} indeterminate={indeterminate} />

  return (
    <label className={cn('flex min-h-12 w-full items-center gap-3', disabled && 'cursor-not-allowed opacity-60', className)}>
      <input
        ref={(node) => {
          if (node) node.indeterminate = indeterminate
        }}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
      />
      {box === 'start' ? face : null}
      {children}
      {box === 'end' ? face : null}
    </label>
  )
}

function CheckFace({ checked, indeterminate }: { checked: boolean; indeterminate: boolean }) {
  const active = checked || indeterminate
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
      )}
    >
      {indeterminate ? <Minus size={16} /> : checked ? <Check size={16} /> : null}
    </span>
  )
}
