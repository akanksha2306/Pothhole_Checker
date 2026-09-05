import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Civic Flow buttons: primary = emerald/on-primary, secondary = card surface with a
 * neutral
 * border, danger = tertiary red. 8px radius, 48px minimum height for primary
 * actions, and a ~5% press-darken for tactile feedback.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:brightness-110 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-card hover:bg-primary/90",
        outline:
          "border border-border bg-card text-foreground shadow-card hover:bg-accent aria-expanded:bg-surface-sunken",
        secondary:
          "border border-border bg-card text-foreground shadow-card hover:bg-accent aria-expanded:bg-surface-sunken",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-card hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline active:brightness-100",
      },
      size: {
        // 48px touch target — DESIGN.md spacing.touch-target. `sm` matches it so
        // secondary controls stay tappable; `xs`/`icon-xs` are for dense,
        // non-essential affordances only.
        default: "h-12 px-5 text-label-lg",
        lg: "h-14 px-6 text-label-lg",
        sm: "h-12 px-4 text-label-lg",
        xs: "h-9 gap-1.5 rounded-md px-3 text-body-md [&_svg:not([class*='size-'])]:size-4",
        icon: "size-12",
        "icon-lg": "size-14",
        "icon-sm": "size-12 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
