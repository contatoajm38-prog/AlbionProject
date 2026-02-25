export interface AlbionItem {
  item_id: string;
  name: string;
  icon_url: string;
  tier: string;
  enchantment: string;
  type: string;
  subtype?: string;
  meta_source: string[];
  manual_review?: boolean;
}

export interface Albion2DResponse {
  item_id: string;
  name_pt: string;
  name_en: string;
  icon: string;
  tier: string;
  category: string;
}

export interface VMEPlanilhaItem {
  ID: string;
  Nome: string;
  Categoria: string;
  Icone: string;
}
