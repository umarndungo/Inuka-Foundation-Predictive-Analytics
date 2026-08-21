"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 p-4", className)}
    {...props}
  >
    {children}
  </div>
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-1 overflow-y-auto p-4", className)}
    {...props}
  >
    {children}
  </div>
));
SidebarContent.displayName = "SidebarContent";

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative flex flex-col p-2", className)}
    {...props}
  >
    {children}
  </div>
));
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-3 py-1.5 text-xs font-semibold text-muted-foreground", className)}
    {...props}
  >
    {children}
  </div>
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-1", className)} {...props}>
    {children}
  </div>
));
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, children, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-col gap-1", className)}
    {...props}
  >
    {children}
  </ul>
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, children, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props}>
    {children}
  </li>
));
SidebarMenuItem.displayName = "SidebarMenuItem";

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }
>(({ className, asChild = false, isActive = false, tooltip, children, ...props }, ref) => {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-primary text-primary-foreground shadow-sm",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, children, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("mx-3.5 mt-1.5 space-y-1.5 border-l border-sidebar-border pl-3.5", className)}
    {...props}
  >
    {children}
  </ul>
));
SidebarMenuSub.displayName = "SidebarMenuSub";

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

export const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    isActive?: boolean;
  }
>(({ className, asChild = false, isActive = false, children, ...props }, ref) => {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive && "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";