"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { Bell, User, LogOut, Shield, Wifi, WifiOff, HelpCircle, Moon, Sun, Monitor } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { systemStatus, theme, setTheme, addNotification } = useAppStore();
  const [notificationCount, setNotificationCount] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatSyncTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onMenuToggle} className="md:hidden">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Toggle sidebar
          </TooltipContent>
        </Tooltip>

        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-heading font-semibold text-lg text-foreground">Inuka Sentinel</span>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-6" />
            <div className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        systemStatus?.isOnline ? "bg-success" : "bg-destructive"
                      )}
                    />
                    {systemStatus?.isOnline ? "System operational" : "Offline mode"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  System {systemStatus?.isOnline ? "operational" : "offline"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5" />
                    Last sync: {formatSyncTime(systemStatus?.lastSync || null)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Last sync: {formatSyncTime(systemStatus?.lastSync || null)}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Notifications
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
                    const currentIndex = themes.indexOf(theme);
                    setTheme(themes[(currentIndex + 1) % themes.length]);
                  }}
                >
                  {theme === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : theme === "light" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Monitor className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Theme
              </TooltipContent>
            </Tooltip>

<DropdownMenu>
              <DropdownMenuTrigger>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="/placeholder-avatar.png" alt="User" />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    User menu
                  </TooltipContent>
                </Tooltip>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-sm">Program Coordinator</p>
                    <p className="text-xs text-muted-foreground">Inuka Foundation</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => addNotification({ message: "Profile settings coming soon", type: "info" })}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addNotification({ message: "Preferences saved", type: "success" })}>
                  <Shield className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addNotification({ message: "Help documentation coming soon", type: "info" })}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help & Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => addNotification({ message: "Logged out successfully", type: "success" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}