import { ItemDataService } from "./itemDataService";
import { POPULAR_ITEMS } from "../constants";
import { AlbionItem } from "../types";

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 20; // Process in batches to avoid overwhelming the browser/API

export class SyncService {
  static async autoSync(onProgress?: (current: number, total: number) => void): Promise<void> {
    const lastSync = localStorage.getItem('last_item_sync');
    const now = new Date();

    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      if (now.getTime() - lastSyncDate.getTime() < SYNC_INTERVAL_MS) {
        console.log("Auto-sync skipped: last sync was less than 24h ago.");
        return;
      }
    }

    console.log("Starting automatic background sync...");
    const itemIds = POPULAR_ITEMS.map(i => i.id);
    const total = itemIds.length;
    const results: AlbionItem[] = [];

    // Load existing data to avoid losing it if sync fails halfway
    const existingDataStr = localStorage.getItem('synced_items_data');
    const existingData: AlbionItem[] = existingDataStr ? JSON.parse(existingDataStr) : [];
    const existingMap = new Map(existingData.map(i => [i.item_id, i]));

    for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
      const batch = itemIds.slice(i, i + BATCH_SIZE);
      
      // Process batch
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          // If we already have it and it's not too old, we could skip, 
          // but user wants "automatic sync" which implies refreshing.
          return await ItemDataService.syncItems([id]);
        })
      );

      batchResults.forEach(res => results.push(...res));
      
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, total), total);
      }

      // Small delay between batches to be polite
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Save partial progress every few batches
      if (i % (BATCH_SIZE * 5) === 0) {
        localStorage.setItem('synced_items_data', JSON.stringify(results));
      }
    }

    localStorage.setItem('synced_items_data', JSON.stringify(results));
    localStorage.setItem('last_item_sync', now.toISOString());
    console.log("Automatic background sync completed.");
  }

  static getSyncedItems(): Record<string, AlbionItem> {
    const saved = localStorage.getItem('synced_items_data');
    if (!saved) return {};
    try {
      const data: AlbionItem[] = JSON.parse(saved);
      return data.reduce((acc, item) => {
        acc[item.item_id] = item;
        return acc;
      }, {} as Record<string, AlbionItem>);
    } catch {
      return {};
    }
  }
}
