import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { OfflineQueueItem, TelemetryEvent, Beneficiary } from "@/types";

interface InukaDB extends DBSchema {
  offlineQueue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { "by-status": string; "by-type": string; "by-timestamp": string };
  };
  cachedBeneficiaries: {
    key: string;
    value: Beneficiary & { cachedAt: string };
    indexes: { "by-region": string; "by-risk-tier": string };
  };
  cachedTelemetry: {
    key: string;
    value: TelemetryEvent & { cachedAt: string };
    indexes: { "by-beneficiary": string; "by-region": string; "by-timestamp": string };
  };
  cachedAlerts: {
    key: string;
    value: { id: string; data: unknown; cachedAt: string };
    indexes: { "by-status": string; "by-severity": string };
  };
  cachedMetrics: {
    key: string;
    value: { key: string; data: unknown; cachedAt: string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown; updatedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<InukaDB>> | null = null;

function getDB(): Promise<IDBPDatabase<InukaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<InukaDB>("inuka-sentinel", 1, {
      upgrade(db) {
        const queueStore = db.createObjectStore("offlineQueue", { keyPath: "id" });
        queueStore.createIndex("by-status", "status");
        queueStore.createIndex("by-type", "type");
        queueStore.createIndex("by-timestamp", "timestamp");

        const benStore = db.createObjectStore("cachedBeneficiaries", { keyPath: "id" });
        benStore.createIndex("by-region", "region");
        benStore.createIndex("by-risk-tier", "riskTier");

        const telStore = db.createObjectStore("cachedTelemetry", { keyPath: "id" });
        telStore.createIndex("by-beneficiary", "beneficiaryId");
        telStore.createIndex("by-region", "region");
        telStore.createIndex("by-timestamp", "timestamp");

        const alertStore = db.createObjectStore("cachedAlerts", { keyPath: "id" });
        alertStore.createIndex("by-status", "status");
        alertStore.createIndex("by-severity", "severity");

        db.createObjectStore("cachedMetrics", { keyPath: "key" });
        db.createObjectStore("settings", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function addToOfflineQueue(item: Omit<OfflineQueueItem, "id" | "retries" | "status">): Promise<string> {
  const db = await getDB();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const queueItem: OfflineQueueItem = {
    ...item,
    id,
    retries: 0,
    status: "pending",
  };
  await db.add("offlineQueue", queueItem);
  return id;
}

export async function getOfflineQueue(status?: OfflineQueueItem["status"]): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  if (status) {
    return db.getAllFromIndex("offlineQueue", "by-status", status);
  }
  return db.getAll("offlineQueue");
}

export async function updateQueueItemStatus(id: string, status: OfflineQueueItem["status"]): Promise<void> {
  const db = await getDB();
  const item = await db.get("offlineQueue", id);
  if (item) {
    item.status = status;
    if (status === "syncing") item.retries += 1;
    await db.put("offlineQueue", item);
  }
}

export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offlineQueue", id);
}

export async function clearSyncedQueue(): Promise<number> {
  const db = await getDB();
  const items = await db.getAllFromIndex("offlineQueue", "by-status", "synced");
  for (const item of items) {
    await db.delete("offlineQueue", item.id);
  }
  return items.length;
}

export async function cacheBeneficiaries(beneficiaries: Beneficiary[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cachedBeneficiaries", "readwrite");
  const now = new Date().toISOString();
  for (const ben of beneficiaries) {
    await tx.store.put({ ...ben, cachedAt: now });
  }
  await tx.done;
}

export async function getCachedBeneficiaries(region?: string, riskTier?: string): Promise<Beneficiary[]> {
  const db = await getDB();
  if (region && riskTier) {
    const byRegion = await db.getAllFromIndex("cachedBeneficiaries", "by-region", region);
    return byRegion.filter((b) => b.riskTier === riskTier);
  }
  if (region) {
    return db.getAllFromIndex("cachedBeneficiaries", "by-region", region);
  }
  if (riskTier) {
    return db.getAllFromIndex("cachedBeneficiaries", "by-risk-tier", riskTier);
  }
  return db.getAll("cachedBeneficiaries");
}

export async function cacheTelemetry(events: TelemetryEvent[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cachedTelemetry", "readwrite");
  const now = new Date().toISOString();
  for (const event of events) {
    await tx.store.put({ ...event, cachedAt: now });
  }
  await tx.done;
}

export async function getCachedTelemetry(beneficiaryId?: string, limit = 100): Promise<TelemetryEvent[]> {
  const db = await getDB();
  if (beneficiaryId) {
    const events = await db.getAllFromIndex("cachedTelemetry", "by-beneficiary", beneficiaryId);
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
  const all = await db.getAll("cachedTelemetry");
  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}

export async function cacheAlerts(alerts: Array<{ id: string; data: unknown }>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("cachedAlerts", "readwrite");
  const now = new Date().toISOString();
  for (const alert of alerts) {
    await tx.store.put({ ...alert, cachedAt: now });
  }
  await tx.done;
}

export async function getCachedAlerts(status?: string): Promise<Array<{ id: string; data: unknown }>> {
  const db = await getDB();
  if (status) {
    return db.getAllFromIndex("cachedAlerts", "by-status", status);
  }
  return db.getAll("cachedAlerts");
}

export async function cacheMetrics(key: string, data: unknown): Promise<void> {
  const db = await getDB();
  await db.put("cachedMetrics", { key, data, cachedAt: new Date().toISOString() });
}

export async function getCachedMetrics(key: string): Promise<unknown | null> {
  const db = await getDB();
  const result = await db.get("cachedMetrics", key);
  return result?.data || null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value, updatedAt: new Date().toISOString() });
}

export async function getSetting(key: string): Promise<unknown | null> {
  const db = await getDB();
  const result = await db.get("settings", key);
  return result?.value || null;
}

export async function getPendingQueueCount(): Promise<number> {
  const db = await getDB();
  const items = await db.getAllFromIndex("offlineQueue", "by-status", "pending");
  return items.length;
}

export async function getFailedQueueCount(): Promise<number> {
  const db = await getDB();
  const items = await db.getAllFromIndex("offlineQueue", "by-status", "failed");
  return items.length;
}