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
      "inline-flex items-center justify-center rounded-lg font-semibold tracking-tight transition-all shadow-[0_8px_24px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/80 hover:shadow-[0_12px_32px_rgba(59,130,246,0.35)] hover:-translate-y-[1px]",
      primary:
        "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/80 hover:shadow-[0_12px_32px_rgba(59,130,246,0.35)] hover:-translate-y-[1px]",
      outline:
        "border border-slate-500/70 bg-slate-800/70 text-gray-100 hover:border-blue-400 hover:shadow-[0_10px_28px_rgba(59,130,246,0.25)] hover:-translate-y-[1px]",
      secondary:
        "border border-slate-500/70 bg-slate-800/70 text-gray-100 hover:border-blue-400 hover:shadow-[0_10px_28px_rgba(59,130,246,0.25)] hover:-translate-y-[1px]",
      ghost:
        "text-gray-200 bg-transparent hover:bg-slate-800/60 border border-transparent hover:border-slate-600/60 hover:-translate-y-[1px]",
      destructive:
        "bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-400/80 shadow-[0_10px_28px_rgba(239,68,68,0.25)] hover:shadow-[0_14px_36px_rgba(239,68,68,0.4)] hover:-translate-y-[1px]",
      danger:
        "bg-gradient-to-r from-red-600 to-rose-700 text-white border border-red-400/80 shadow-[0_10px_28px_rgba(239,68,68,0.25)] hover:shadow-[0_14px_36px_rgba(239,68,68,0.4)] hover:-translate-y-[1px]",
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
