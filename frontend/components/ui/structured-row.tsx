"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const rowVariants = cva(
  "flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors",
  {
    variants: {
      intent: {
        default: "bg-card border-border/60 hover:bg-secondary/60",
        muted: "bg-secondary/30 border-border/30 hover:bg-secondary/50",
        danger: "bg-red-50 border-red-200 hover:bg-red-100/60",
        interactive: "bg-card border-border/60 hover:bg-accent/40 hover:border-primary/20 cursor-pointer",
      },
    },
    defaultVariants: { intent: "default" },
  }
);

interface StructuredRowProps extends VariantProps<typeof rowVariants> {
  leading?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StructuredRow({
  leading,
  primary,
  secondary,
  trailing,
  intent,
  className,
  onClick,
}: StructuredRowProps) {
  return (
    <div
      className={cn(rowVariants({ intent }), onClick && "cursor-pointer", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{primary}</div>
        {secondary && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">{secondary}</div>
        )}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
    </div>
  );
}
