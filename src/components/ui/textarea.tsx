import * as React from 'react'

import { cn } from '../../lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base outline-none transition placeholder:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
      className,
    )}
    {...props}
  />
))

Textarea.displayName = 'Textarea'
