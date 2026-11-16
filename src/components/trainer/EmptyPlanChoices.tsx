type EmptyPlanChoicesProps = {
  catalogPending: boolean
  manualPending: boolean
  blockReason: string | null
  onCatalog: () => void
  onManual: () => void
}

const cardClass =
  'rounded-2xl border border-border bg-card p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50'

export function EmptyPlanChoices({ catalogPending, manualPending, blockReason, onCatalog, onManual }: EmptyPlanChoicesProps) {
  return (
    <div className="mt-4 grid gap-3">
      <div>
        <p className="text-[22px] font-bold">Плана ещё нет</p>
        <p className="mt-1 text-[15px] text-secondary-foreground">Выберите, как составить первый план.</p>
      </div>
      <button type="button" className={cardClass} disabled={catalogPending} onClick={onCatalog}>
        <span className="block text-[17px] font-semibold">Собрать из каталога</span>
        <span className="mt-1 block text-[15px] text-secondary-foreground">Подберём план по анкете и правилам генератора.</span>
        {blockReason ? <span className="mt-2 block text-[15px] text-secondary-foreground">{blockReason}</span> : null}
      </button>
      <button type="button" className={cardClass} disabled={manualPending} onClick={onManual}>
        <span className="block text-[17px] font-semibold">Составить вручную</span>
        <span className="mt-1 block text-[15px] text-secondary-foreground">
          Пустой план: дни и упражнения задаёте вы и сохраняете кнопкой «Сохранить план».
        </span>
      </button>
    </div>
  )
}
