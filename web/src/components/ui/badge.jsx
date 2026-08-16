import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Status pills — soft tint + solid text + a leading dot in the current colour
 * (the reference "pill" pattern). `plain` drops the dot for non-status labels.
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center gap-[5px] rounded-full px-[9px] py-[3px] text-[11.5px] leading-[1.5] font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3 before:size-[5px] before:shrink-0 before:rounded-full before:bg-current before:content-[""]',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'text-foreground ring-border ring-1 ring-inset',
        destructive: 'bg-destructive-soft text-destructive',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        info: 'bg-info-soft text-info',
        purple: 'bg-purple-soft text-purple',
        muted: 'bg-secondary text-muted-foreground',
        plain: 'bg-secondary text-muted-foreground before:hidden',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'span';
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
