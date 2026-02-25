import { AlbionItem, Albion2DResponse, VMEPlanilhaItem } from "../types";

const ALBION_2D_BASE_URL = "https://albiononline2d.com/item/id";
const VME_PLANILHAS_URL = "https://vme-planilhas.vercel.app/api/transporte"; // Hypothetical endpoint

export class ItemDataService {
  /**
   * Fetches item data from AlbionOnline2D
   */
  static async fetchFromAlbion2D(itemId: string): Promise<Partial<AlbionItem> | null> {
    try {
      const response = await fetch(`${ALBION_2D_BASE_URL}/${itemId}`);
      if (!response.ok) return null;

      const data: Albion2DResponse = await response.json();
      
      // Extract tier and enchantment from ID if not provided
      const [baseId, enchantment] = itemId.split("@");
      const tierMatch = baseId.match(/^T(\d+)/);
      const tier = tierMatch ? `T${tierMatch[1]}` : data.tier;

      return {
        item_id: itemId,
        name: data.name_pt || data.name_en,
        icon_url: `https://albiononline2d.com/icons/${data.icon}.png`,
        tier: tier,
        enchantment: enchantment || "0",
        type: data.category,
        meta_source: ["albiononline2d"]
      };
    } catch (error) {
      console.error(`Error fetching ${itemId} from Albion2D:`, error);
      return null;
    }
  }

  /**
   * Fetches all items from VME Planilhas
   */
  static async fetchFromVME(): Promise<VMEPlanilhaItem[]> {
    try {
      const response = await fetch(VME_PLANILHAS_URL);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Error fetching from VME Planilhas:", error);
      return [];
    }
  }

  /**
   * Syncs and merges data for a list of item IDs
   */
  static async syncItems(itemIds: string[]): Promise<AlbionItem[]> {
    const vmeData = await this.fetchFromVME();
    const vmeMap = new Map(vmeData.map(item => [item.ID, item]));

    const syncedItems: AlbionItem[] = [];

    for (const itemId of itemIds) {
      const vmeItem = vmeMap.get(itemId);
      const a2dItem = await this.fetchFromAlbion2D(itemId);

      if (!vmeItem && !a2dItem) {
        syncedItems.push({
          item_id: itemId,
          name: itemId,
          icon_url: "",
          tier: itemId.split("_")[0],
          enchantment: itemId.split("@")[1] || "0",
          type: "Unknown",
          meta_source: [],
          manual_review: true
        });
        continue;
      }

      // Priority logic: VME > Albion2D
      const mergedItem: AlbionItem = {
        item_id: itemId,
        name: vmeItem?.Nome || a2dItem?.name || itemId,
        icon_url: vmeItem?.Icone || a2dItem?.icon_url || "",
        tier: a2dItem?.tier || itemId.split("_")[0],
        enchantment: a2dItem?.enchantment || itemId.split("@")[1] || "0",
        type: vmeItem?.Categoria || a2dItem?.type || "Unknown",
        meta_source: []
      };

      if (vmeItem) mergedItem.meta_source.push("vme_planilhas");
      if (a2dItem) mergedItem.meta_source.push("albiononline2d");

      syncedItems.push(mergedItem);
    }

    return syncedItems;
  }
}
