import { useEffect, useState } from 'react'
import { ArrowLeft, PencilLine } from 'lucide-react'

import {
  CANONICAL_EQUIPMENT_OPTIONS,
  CUSTOM_EQUIPMENT_SENTINEL,
  isCanonicalEquipment,
  normalizeEquipmentName,
} from '../../lib/equipment'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { StyledSelect } from './styled-select'

type EquipmentPickerProps = {
  id?: string
  label?: string
  value: string
  disabled?: boolean
  error?: string
  onChange: (value: string) => void
}

export function EquipmentPicker({
  id = 'equipment',
  label = 'Инвентарь (нужен для выполнения)',
  value,
  disabled,
  error,
  onChange,
}: EquipmentPickerProps) {
  const isCustomValue = Boolean(value) && value !== 'none' && !isCanonicalEquipment(value)
  const [mode, setMode] = useState<'preset' | 'custom'>(isCustomValue ? 'custom' : 'preset')
  const [draftName, setDraftName] = useState(isCustomValue ? value : '')

  useEffect(() => {
    if (isCustomValue) {
      setMode('custom')
      setDraftName(value)
      return
    }
    if (value === 'none' || isCanonicalEquipment(value)) {
      setMode('preset')
      setDraftName('')
    }
  }, [isCustomValue, value])

  if (mode === 'custom') {
    return (
      <div className="grid gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <Label htmlFor={id} className="flex items-center gap-1.5">
              <PencilLine size={14} className="text-primary" />
              Свой инвентарь
            </Label>
            <p className="text-xs text-secondary-foreground">Напиши название так, как поймёт клиент</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            className="h-8 shrink-0 gap-1 px-2 text-xs"
            onClick={() => {
              setMode('preset')
              setDraftName('')
              onChange('none')
            }}
          >
            <ArrowLeft size={12} />
            К списку
          </Button>
        </div>
        <Input
          id={id}
          disabled={disabled}
          autoFocus
          placeholder="Например: турник, TRX, аэробайк"
          value={draftName}
          onChange={(event) => {
            const next = event.target.value
            setDraftName(next)
            const normalized = normalizeEquipmentName(next)
            // Keep raw while typing so the field doesn't fight the user; empty clears.
            if (!next.trim()) {
              onChange('')
              return
            }
            onChange(normalized ?? next.trim())
          }}
          onBlur={() => {
            const normalized = normalizeEquipmentName(draftName)
            if (normalized) {
              setDraftName(normalized)
              onChange(normalized)
            }
          }}
        />
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    )
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <StyledSelect
        id={id}
        disabled={disabled}
        options={[
          ...CANONICAL_EQUIPMENT_OPTIONS,
          { value: CUSTOM_EQUIPMENT_SENTINEL, label: 'Свой инвентарь…' },
        ]}
        value={isCanonicalEquipment(value) || value === 'none' ? value : 'none'}
        onChange={(nextValue) => {
          if (nextValue === CUSTOM_EQUIPMENT_SENTINEL) {
            setMode('custom')
            setDraftName('')
            onChange('')
            return
          }
          onChange(nextValue)
        }}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
