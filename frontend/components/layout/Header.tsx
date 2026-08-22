"use client";

import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="md:hidden flex h-12 items-center justify-between border-b border-border bg-card px-4 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="text-foreground h-8 w-8 rounded-md"
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="w-4 h-4" />
      </Button>
      <span className="font-heading font-bold text-xs tracking-tight text-foreground">
        Inuka Sentinel
      </span>
    </header>
  );
}
