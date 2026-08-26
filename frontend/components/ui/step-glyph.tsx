"use client";

import { cn } from "@/lib/utils";
import {
  Shield,
  Map,
  BarChart3,
  Bell,
} from "lucide-react";

const GLYPH_ICONS: Record<number, typeof Shield> = {
  1: Shield,
  2: Map,
  3: BarChart3,
  4: Bell,
};

interface StepGlyphProps {
  step: number;
  active?: boolean;
  completed?: boolean;
  className?: string;
}

export function StepGlyph({ step, active, completed, className }: StepGlyphProps) {
  const Icon = GLYPH_ICONS[step] ?? Shield;

  return (
    <div
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
        completed && "bg-primary border-primary text-primary-foreground",
        active && "border-primary text-primary bg-primary/5",
        !active && !completed && "border-border text-muted-foreground bg-secondary/40",
        className
      )}
    >
      {completed ? (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </div>
  );
}
