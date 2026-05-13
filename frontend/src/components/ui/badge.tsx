import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-accent-primary text-tx-inverse hover:bg-accent-primary/80",
        secondary:
          "border-transparent bg-app-elevated text-tx-primary hover:bg-app-hover",
        destructive:
          "border-transparent bg-accent-danger text-tx-primary hover:bg-accent-danger/80",
        outline: "text-tx-primary border-app-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
