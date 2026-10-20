type GenerateBlockNoteProps = {
  reason: string | null
}

export function GenerateBlockNote({ reason }: GenerateBlockNoteProps) {
  if (!reason) return null
  return (
    <p className="text-sm text-secondary-foreground" role="status">
      {reason}
    </p>
  )
}
