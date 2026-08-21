"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Bell, Palette, Database, Wifi, Globe, Key, Moon, Sun, Monitor, Save, Loader2, CheckCircle, Activity, RotateCcw, Copy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const { theme, setTheme, addNotification } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: "Program Coordinator",
    email: "coordinator@inuka.org",
    role: "Program Coordinator",
    organization: "Inuka Foundation",
    phone: "+254 7XX XXX XXX",
    region: "All Regions",
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "Africa/Nairobi",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-KE",
    autoRefresh: true,
    refreshInterval: 30,
    compactMode: false,
    animations: true,
    soundNotifications: true,
  });

  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    highRiskAlerts: true,
    mediumRiskAlerts: false,
    lowRiskAlerts: false,
    syncNotifications: true,
    systemNotifications: true,
    emailNotifications: false,
    smsNotifications: false,
    pushNotifications: true,
  });

  const [appearance, setAppearance] = useState({
    theme: theme,
    sidebarCollapsed: false,
    density: "comfortable",
    primaryColor: "emerald",
  });

  const [data, setData] = useState({
    autoSync: true,
    syncInterval: 5,
    cacheSize: 100,
    retainDays: 30,
    exportFormat: "json",
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: 60,
    apiKey: "sk_live_****_****_****_abcd",
    allowedIPs: "",
  });

  const handleSave = async (section: string) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    addNotification({ message: `${section} settings saved successfully`, type: "success" });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-h1 font-semibold tracking-tight">Settings</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              Manage your account, preferences, and system configuration.
            </p>
          </div>
          {saved && (
            <div className="flex items-center gap-2 text-small text-success animate-in">
              <CheckCircle className="w-4 h-4" />
              Settings saved
            </div>
          )}
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
            <TabsTrigger value="preferences"><Shield className="w-4 h-4 mr-2" />Preferences</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="w-4 h-4 mr-2" />Appearance</TabsTrigger>
            <TabsTrigger value="data"><Database className="w-4 h-4 mr-2" />Data & Sync</TabsTrigger>
            <TabsTrigger value="security"><Key className="w-4 h-4 mr-2" />Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Profile Information</CardTitle>
                <CardDescription>Manage your personal information and account details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input id="organization" value={profile.organization} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Default Region</Label>
                    <Select value={profile.region} onValueChange={(v) => setProfile({ ...profile, region: v ?? "All Regions" })}>
                      <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Regions">All Regions</SelectItem>
                        <SelectItem value="Nairobi">Nairobi</SelectItem>
                        <SelectItem value="Kisumu">Kisumu</SelectItem>
                        <SelectItem value="Nakuru">Nakuru</SelectItem>
                        <SelectItem value="Mombasa">Mombasa</SelectItem>
                        <SelectItem value="Eldoret">Eldoret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => handleSave("Profile")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Profile
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Account Status</CardTitle>
                <CardDescription>Current account and session information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-caption text-muted-foreground">Account Type</p>
                    <p className="font-medium text-small mt-1">Administrator</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-caption text-muted-foreground">Last Login</p>
                    <p className="font-medium text-small mt-1">Today, 08:42 AM</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-caption text-muted-foreground">Session Expires</p>
                    <p className="font-medium text-small mt-1">In 8 hours</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-caption text-muted-foreground">2FA Status</p>
                    <p className="font-medium text-small text-destructive mt-1">Disabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">General Preferences</CardTitle>
                <CardDescription>Configure default behaviors and display options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select value={preferences.language} onValueChange={(v) => setPreferences({ ...preferences, language: v ?? "en" })}>
                      <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Kiswahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={preferences.timezone} onValueChange={(v) => setPreferences({ ...preferences, timezone: v ?? "Africa/Nairobi" })}>
                      <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={preferences.dateFormat} onValueChange={(v) => setPreferences({ ...preferences, dateFormat: v ?? "DD/MM/YYYY" })}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numberFormat">Number Format</Label>
                    <Select value={preferences.numberFormat} onValueChange={(v) => setPreferences({ ...preferences, numberFormat: v ?? "en-KE" })}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-KE">Kenya (1,234.56)</SelectItem>
                        <SelectItem value="en-US">US (1,234.56)</SelectItem>
                        <SelectItem value="de-DE">German (1.234,56)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-small">Auto Refresh</p>
                      <p className="text-caption text-muted-foreground">Automatically refresh dashboard data</p>
                    </div>
                    <Switch checked={preferences.autoRefresh} onCheckedChange={(c) => setPreferences({ ...preferences, autoRefresh: c })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input id="refreshInterval" type="number" min="10" max="300" value={preferences.refreshInterval} onChange={(e) => setPreferences({ ...preferences, refreshInterval: parseInt(e.target.value) })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-small">Compact Mode</p>
                      <p className="text-caption text-muted-foreground">Reduce spacing for denser information display</p>
                    </div>
                    <Switch checked={preferences.compactMode} onCheckedChange={(c) => setPreferences({ ...preferences, compactMode: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-small">Animations</p>
                      <p className="text-caption text-muted-foreground">Enable UI animations and transitions</p>
                    </div>
                    <Switch checked={preferences.animations} onCheckedChange={(c) => setPreferences({ ...preferences, animations: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-small">Sound Notifications</p>
                      <p className="text-caption text-muted-foreground">Play sound for critical alerts</p>
                    </div>
                    <Switch checked={preferences.soundNotifications} onCheckedChange={(c) => setPreferences({ ...preferences, soundNotifications: c })} />
                  </div>
                </div>

                <Button onClick={() => handleSave("Preferences")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Alert Notifications</CardTitle>
                <CardDescription>Configure which alerts trigger notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  {[
                    { key: "criticalAlerts", label: "Critical Risk Alerts", desc: "Immediate notification for critical risk beneficiaries", default: true },
                    { key: "highRiskAlerts", label: "High Risk Alerts", desc: "Notification for high risk beneficiaries", default: true },
                    { key: "mediumRiskAlerts", label: "Medium Risk Alerts", desc: "Notification for medium risk beneficiaries", default: false },
                    { key: "lowRiskAlerts", label: "Low Risk Alerts", desc: "Notification for low risk beneficiaries", default: false },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-small">{item.label}</p>
                        <p className="text-caption text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(c) => setNotifications({ ...notifications, [item.key]: c })} />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  {[
                    { key: "syncNotifications", label: "Sync Notifications", desc: "Notify when data synchronization completes or fails" },
                    { key: "systemNotifications", label: "System Notifications", desc: "System maintenance and status updates" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-small">{item.label}</p>
                        <p className="text-caption text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(c) => setNotifications({ ...notifications, [item.key]: c })} />
                    </div>
                  ))}
                </div>

                <Button onClick={() => handleSave("Notifications")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Notification Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Delivery Channels</CardTitle>
                <CardDescription>Choose how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  {[
                    { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications", icon: Bell },
                    { key: "emailNotifications", label: "Email Notifications", desc: "Email delivery for alerts", icon: Globe },
                    { key: "smsNotifications", label: "SMS Notifications", desc: "SMS delivery for critical alerts", icon: Wifi },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-small">{item.label}</p>
                          <p className="text-caption text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(c) => setNotifications({ ...notifications, [item.key]: c })} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Theme & Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <div className="flex gap-3">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Monitor },
                    ].map((t) => (
                      <Button
                        key={t.value}
                        variant={appearance.theme === t.value ? "default" : "outline"}
                        className="flex-1 gap-2"
                        onClick={() => { setAppearance({ ...appearance, theme: t.value as "light" | "dark" | "system" }); setTheme(t.value as "light" | "dark" | "system"); }}
                      >
                        <t.icon className="w-4 h-4" /> {t.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sidebar State</Label>
                  <div className="flex gap-3">
                    <Button variant={!appearance.sidebarCollapsed ? "default" : "outline"} onClick={() => setAppearance({ ...appearance, sidebarCollapsed: false })}>
                      Expanded
                    </Button>
                    <Button variant={appearance.sidebarCollapsed ? "default" : "outline"} onClick={() => setAppearance({ ...appearance, sidebarCollapsed: true })}>
                      Collapsed
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Information Density</Label>
                  <Select value={appearance.density} onValueChange={(v) => setAppearance({ ...appearance, density: (v ?? "comfortable") as "compact" | "comfortable" | "spacious" })}>
                    <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Select density" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => handleSave("Appearance")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Appearance
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Data & Synchronization</CardTitle>
                <CardDescription>Configure data handling and sync behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="syncInterval">Auto Sync Interval (minutes)</Label>
                    <Input id="syncInterval" type="number" min="1" max="60" value={data.syncInterval} onChange={(e) => setData({ ...data, syncInterval: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cacheSize">Cache Size (MB)</Label>
                    <Input id="cacheSize" type="number" min="10" max="500" value={data.cacheSize} onChange={(e) => setData({ ...data, cacheSize: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retainDays">Data Retention (days)</Label>
                    <Input id="retainDays" type="number" min="7" max="365" value={data.retainDays} onChange={(e) => setData({ ...data, retainDays: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exportFormat">Default Export Format</Label>
                    <Select value={data.exportFormat} onValueChange={(v) => setData({ ...data, exportFormat: v ?? "json" })}>
                      <SelectTrigger id="exportFormat"><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="xlsx">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-small">Auto Sync</p>
                      <p className="text-caption text-muted-foreground">Automatically synchronize offline data when online</p>
                    </div>
                    <Switch checked={data.autoSync} onCheckedChange={(c) => setData({ ...data, autoSync: c })} />
                  </div>
                </div>

                <Button onClick={() => handleSave("Data & Sync")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Data Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Storage Usage</CardTitle>
                <CardDescription>Monitor local storage consumption.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-small">IndexedDB Cache</span>
                    <span className="text-caption text-muted-foreground">~45 MB / 100 MB</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-small">Service Worker Cache</span>
                    <span className="text-caption text-muted-foreground">~12 MB</span>
                  </div>
                  <Progress value={12} className="h-2" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Database className="w-4 h-4 mr-2" />Clear Cache</Button>
                  <Button variant="outline" size="sm"><Wifi className="w-4 h-4 mr-2" />Clear Service Worker</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-h3">Security Settings</CardTitle>
                <CardDescription>Manage authentication and access control.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-small">Two-Factor Authentication</p>
                      <p className="text-caption text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch checked={security.twoFactor} onCheckedChange={(c) => setSecurity({ ...security, twoFactor: c })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input id="sessionTimeout" type="number" min="15" max="480" value={security.sessionTimeout} onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) })} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="flex gap-2">
                    <Input id="apiKey" value={security.apiKey} readOnly className="flex-1 font-mono text-caption" />
                    <Button variant="outline" size="sm"><Copy className="w-4 h-4" />Copy</Button>
                  </div>
                  <p className="text-caption text-muted-foreground">Keep this key secure. Regenerate if compromised.</p>
                </div>
                <Button variant="outline" onClick={() => addNotification({ message: "API key regenerated", type: "success" })} className="w-full sm:w-auto">
                  <RotateCcw className="w-4 h-4 mr-2" />Regenerate API Key
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="allowedIPs">Allowed IP Addresses (CIDR)</Label>
                  <Input id="allowedIPs" placeholder="192.168.1.0/24, 10.0.0.0/8" value={security.allowedIPs} onChange={(e) => setSecurity({ ...security, allowedIPs: e.target.value })} />
                  <p className="text-caption text-muted-foreground">Comma-separated list. Leave empty for no restrictions.</p>
                </div>

                <Button onClick={() => handleSave("Security")} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Security Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}