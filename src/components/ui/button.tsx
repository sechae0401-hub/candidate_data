import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-button transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-done focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-hairline disabled:text-muted",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-charcoal",
        secondary: "border border-hairline bg-white text-ink hover:bg-surface",
        ghost: "bg-transparent text-slate hover:bg-surface",
        danger: "border border-status-error bg-white text-status-error hover:bg-status-error-soft",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "px-4 py-2",
        icon: "h-8 w-8 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
