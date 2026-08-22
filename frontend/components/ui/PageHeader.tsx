import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, badge, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-4 border-b border-border/40">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
            {title}
          </h1>
          {badge && (
            <Badge variant="outline" className="text-[11px] font-mono font-semibold tracking-wide bg-primary/10 border-primary/20 text-primary rounded px-2.5 py-0.5">
              {badge}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl font-sans">
            {description}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-2.5 shrink-0">{children}</div>}
    </div>
  );
}
