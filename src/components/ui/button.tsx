import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-colors disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:brightness-95 disabled:bg-disabled disabled:text-disabled-foreground disabled:opacity-100',
        secondary: 'border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-50',
        ghost: 'bg-transparent text-foreground hover:bg-secondary disabled:opacity-50',
        destructive: 'border border-destructive bg-card text-destructive hover:bg-destructive/10 disabled:opacity-50',
      },
      size: {
        default: 'h-12 px-4 text-[17px]',
        sm: 'h-12 rounded-2xl px-4 text-[15px]',
        lg: 'h-14 rounded-2xl px-6 text-[17px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
