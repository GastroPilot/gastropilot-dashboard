import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "primary" | "secondary" | "danger";
  size?: "default" | "sm" | "lg" | "md";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg font-semibold tracking-tight transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-primary text-primary-foreground border border-primary/80 hover:bg-primary/90 hover:-translate-y-[1px] hover:shadow-md",
      primary:
        "bg-primary text-primary-foreground border border-primary/80 hover:bg-primary/90 hover:-translate-y-[1px] hover:shadow-md",
      outline:
        "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-[1px]",
      secondary:
        "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:-translate-y-[1px]",
      ghost:
        "text-foreground bg-transparent hover:bg-accent border border-transparent hover:border-border hover:-translate-y-[1px]",
      destructive:
        "bg-destructive text-destructive-foreground border border-destructive/80 hover:bg-destructive/90 hover:-translate-y-[1px]",
      danger:
        "bg-destructive text-destructive-foreground border border-destructive/80 hover:bg-destructive/90 hover:-translate-y-[1px]",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "h-9 md:h-10 px-3 md:px-4 py-2 text-sm",
      sm: "h-8 md:h-9 px-2 md:px-3 text-xs",
      md: "h-9 md:h-10 px-3 md:px-4 py-2 text-sm",
      lg: "h-10 md:h-11 px-4 md:px-5 text-sm md:text-base",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(base, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={isDisabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
