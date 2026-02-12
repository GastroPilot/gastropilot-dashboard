import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
};

const textClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-xl",
};

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="478 499 308 266"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size], "w-auto flex-shrink-0")}
        aria-hidden="true"
      >
        <polygon fill="#F95100" points="784.63,631.77 784.59,631.84 759.2,675.84 733.69,720.02 631.59,720.02 631.68,720.17 606.38,764 606.35,764.04 555.38,764.04 555.36,764 580.75,720.02 580.83,719.88 606.25,675.84 708.18,675.84 733.58,631.84 580.98,631.71 606.27,587.9 606.32,587.83 606.4,587.69 759.26,587.83" />
        <polygon fill="#F95100" points="733.56,543.51 733.42,543.75 580.69,543.75 555.25,587.83 555.2,587.9 529.89,631.74 529.95,631.84 555.36,675.84 529.84,720.02 504.38,675.92 504.33,675.84 478.93,631.84 478.87,631.74 504.23,587.83 504.38,587.55 529.67,543.75 529.69,543.72 555.2,499.54 555.24,499.47 708.13,499.47" />
      </svg>
      {showText && (
        <span className={cn("font-semibold tracking-tight", textClasses[size])}>GastroPilot</span>
      )}
    </div>
  );
}
