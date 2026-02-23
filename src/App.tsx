/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Clock, MapPin, AlertCircle, Loader2, Info, ArrowRight, DollarSign, ShoppingCart, Zap, RefreshCw, Filter, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { POPULAR_ITEMS } from './constants';

interface PriceData {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

interface HistoryData {
  location: string;
  item_id: string;
  data: {
    item_count: number;
    avg_price: number;
    timestamp: string;
  }[];
}

interface Opportunity {
  item_id: string;
  item_name: string;
  buy_city: string;
  buy_price: number;
  buy_updated: string;
  sell_city: string;
  sell_price: number;
  sell_updated: string;
  profit: number;
  profit_percent: number;
  avg_volume: number | null;
}

const CITIES = [
  'Caerleon',
  'Black Market',
  'Bridgewatch',
  'Martlock',
  'Fort Sterling',
  'Lymhurst',
  'Thetford',
  'Brecilien'
];

const TRANSLATIONS = {
  pt: {
    subtitle: 'Arbitrage & Price Tracker',
    searchTab: 'Consulta',
    oppTab: 'Oportunidades',
    searchPlaceholder: 'Nome ou ID do item...',
    searchBtn: 'Buscar',
    refreshBtn: 'Atualizar preços',
    apiOnline: 'Online',
    apiOffline: 'Offline',
    bestBuy: 'Melhor COMPRA',
    bestSell: 'Melhor VENDA',
    flipProfit: 'Lucro Flip',
    transportProfit: 'Lucro Transporte',
    dailyVolume: 'Volume Diário (3d)',
    opportunity: 'Oportunidade!',
    noProfit: 'Sem Lucro',
    insufficientData: 'Dados insuficientes',
    salesPerDay: 'Vendas/dia (Média 3 dias)',
    noVolumeData: 'Sem dados de volume',
    resultsFor: 'Resultados para',
    clear: 'Limpar',
    city: 'Cidade',
    sellPrice: 'Venda (Sell Price)',
    buyPrice: 'Compra (Buy Price)',
    lastUpdate: 'Última Atualização',
    noRecentData: 'Sem dados recentes',
    readyToSearch: 'Pronto para consultar?',
    searchDesc: 'Digite o ID técnico do item acima para ver os preços em tempo real e encontrar oportunidades de lucro.',
    searchError: 'Erro na busca',
    marketOpp: 'Oportunidades de Mercado',
    oppDesc: 'Configure os filtros abaixo e escaneie os 250 itens mais populares.',
    found: 'Encontradas',
    scan: 'Escanear',
    buyAt: 'Comprar em:',
    sellAt: 'Vender em:',
    filterTier: 'Filtrar por Tier:',
    all: 'TODOS',
    minProfit: 'Lucro Mínimo por Item:',
    noOppProfit: 'Nenhuma oportunidade com esse lucro',
    lowerFilter: 'Tente diminuir o filtro de lucro mínimo para ver mais resultados.',
    noOppLoaded: 'Nenhuma oportunidade carregada',
    clickScan: 'Clique no botão "Escanear Mercado" acima para buscar as melhores diferenças de preço entre cidades.',
    scanning: 'Escaneando Mercado...',
    scanWait: 'Isso pode levar alguns segundos enquanto processamos os dados da API.',
    safe: 'Seguro',
    medium: 'Mediano',
    risk: 'Risco',
    buyIn: 'Compre em',
    sellIn: 'Venda em',
    volume3d: 'Volume (3d)',
    estProfit: 'Lucro Estimado',
    viewDetails: 'Ver Detalhes Completos',
    footerDesc: 'Os dados são fornecidos pela comunidade e podem não refletir os preços exatos no jogo em tempo real. Use com cautela para decisões de mercado de alto risco.',
    databaseDesc: 'Banco de dados: {count} itens populares pré-carregados. Pesquisa manual suporta todos os itens do jogo via ID técnico.',
    silver: 'Prata',
    noData: 'Sem dados',
    favTab: 'Favoritos',
    investment: 'Investimento Total',
    return: 'Retorno Estimado (BM)',
    quantity: 'Qtd',
    totalProfit: 'Lucro Total',
    riskLevel: 'Nível de Risco',
    noFavs: 'Nenhum item favoritado',
    addFavs: 'Adicione itens aos favoritos clicando na estrela nos resultados de busca ou oportunidades.',
    buyPriceFav: 'Preço de Compra',
    sellPriceBM: 'Venda (Black Market)',
    totalInvestment: 'Total Investido',
    totalReturn: 'Total Retorno',
    silverInvested: 'Prata Investida',
    silverReturn: 'Prata de Retorno'
  },
  en: {
    subtitle: 'Arbitrage & Price Tracker',
    searchTab: 'Search',
    oppTab: 'Opportunities',
    searchPlaceholder: 'Item name or ID...',
    searchBtn: 'Search',
    refreshBtn: 'Refresh prices',
    apiOnline: 'Online',
    apiOffline: 'Offline',
    bestBuy: 'Best BUY',
    bestSell: 'Best SELL',
    flipProfit: 'Flip Profit',
    transportProfit: 'Transport Profit',
    dailyVolume: 'Daily Volume (3d)',
    opportunity: 'Opportunity!',
    noProfit: 'No Profit',
    insufficientData: 'Insufficient data',
    salesPerDay: 'Sales/day (3-day average)',
    noVolumeData: 'No volume data',
    resultsFor: 'Results for',
    clear: 'Clear',
    city: 'City',
    sellPrice: 'Sell Price',
    buyPrice: 'Buy Price',
    lastUpdate: 'Last Update',
    noRecentData: 'No recent data',
    readyToSearch: 'Ready to search?',
    searchDesc: 'Enter the item\'s technical ID above to see real-time prices and find profit opportunities.',
    searchError: 'Search error',
    marketOpp: 'Market Opportunities',
    oppDesc: 'Configure the filters below and scan the 250 most popular items.',
    found: 'Found',
    scan: 'Scan',
    buyAt: 'Buy at:',
    sellAt: 'Sell at:',
    filterTier: 'Filter by Tier:',
    all: 'ALL',
    minProfit: 'Min Profit per Item:',
    noOppProfit: 'No opportunities with this profit',
    lowerFilter: 'Try lowering the minimum profit filter to see more results.',
    noOppLoaded: 'No opportunities loaded',
    clickScan: 'Click the "Scan Market" button above to find the best price differences between cities.',
    scanning: 'Scanning Market...',
    scanWait: 'This may take a few seconds while we process the API data.',
    safe: 'Safe',
    medium: 'Medium',
    risk: 'Risk',
    buyIn: 'Buy at',
    sellIn: 'Sell at',
    volume3d: 'Volume (3d)',
    estProfit: 'Estimated Profit',
    viewDetails: 'View Full Details',
    footerDesc: 'Data is provided by the community and may not reflect exact in-game prices in real-time. Use with caution for high-risk market decisions.',
    databaseDesc: 'Database: {count} popular items pre-loaded. Manual search supports all in-game items via technical ID.',
    silver: 'Silver',
    noData: 'No data',
    favTab: 'Favorites',
    investment: 'Total Investment',
    return: 'Estimated Return (BM)',
    quantity: 'Qty',
    totalProfit: 'Total Profit',
    riskLevel: 'Risk Level',
    noFavs: 'No favorited items',
    addFavs: 'Add items to favorites by clicking the star in search results or opportunities.',
    buyPriceFav: 'Buy Price',
    sellPriceBM: 'Sell (Black Market)',
    totalInvestment: 'Total Invested',
    totalReturn: 'Total Return',
    silverInvested: 'Silver Invested',
    silverReturn: 'Silver Return'
  }
};

export default function App() {
  const [language, setLanguage] = useState<'pt' | 'en'>('pt');
  const t = TRANSLATIONS[language];
  
  const [activeTab, setActiveTab] = useState<'search' | 'opportunities' | 'favorites'>('search');
  const [itemId, setItemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [avgVolume, setAvgVolume] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedItem, setSearchedItem] = useState('');
  
  // Opportunities state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [buyCities, setBuyCities] = useState<string[]>(['Lymhurst']);
  const [sellCities, setSellCities] = useState<string[]>(['Caerleon', 'Black Market']);
  const [minProfit, setMinProfit] = useState(0);
  const [tierFilter, setTierFilter] = useState<'all' | '6-' | '6+'>('all');

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('albion_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [favoriteQuantities, setFavoriteQuantities] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('albion_fav_quantities');
    return saved ? JSON.parse(saved) : {};
  });
  const [favoritePrices, setFavoritePrices] = useState<Record<string, PriceData[]>>({});

  useEffect(() => {
    localStorage.setItem('albion_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('albion_fav_quantities', JSON.stringify(favoriteQuantities));
  }, [favoriteQuantities]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const updateQuantity = (id: string, qty: number) => {
    setFavoriteQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, qty)
    }));
  };

  const fetchFavoritePrices = async () => {
    if (favorites.length === 0) return;
    setLoading(true);
    try {
      const itemIds = favorites.join(',');
      const apiLocations = CITIES.map(c => c.replace(/\s/g, '')).join(',');
      const url = `https://west.albion-online-data.com/api/v2/stats/prices/${itemIds}.json?locations=${apiLocations}&qualities=1,2,3`;
      const res = await fetch(url);
      if (res.ok) {
        const data: PriceData[] = await res.json();
        
        // Merge qualities per item and city
        const mergedData: PriceData[] = [];
        const seen = new Map<string, PriceData>();
        
        data.forEach(curr => {
          const key = `${curr.item_id}-${curr.city}`;
          const existing = seen.get(key);
          if (!existing) {
            seen.set(key, { ...curr });
          } else {
            if (curr.sell_price_min > 0 && (existing.sell_price_min === 0 || curr.sell_price_min < existing.sell_price_min)) {
              existing.sell_price_min = curr.sell_price_min;
              existing.sell_price_min_date = curr.sell_price_min_date;
            }
            if (curr.buy_price_max > 0 && (existing.buy_price_max === 0 || curr.buy_price_max > existing.buy_price_max)) {
              existing.buy_price_max = curr.buy_price_max;
              existing.buy_price_max_date = curr.buy_price_max_date;
            }
          }
        });

        const grouped = Array.from(seen.values()).reduce((acc, curr) => {
          if (!acc[curr.item_id]) acc[curr.item_id] = [];
          acc[curr.item_id].push(curr);
          return acc;
        }, {} as Record<string, PriceData[]>);
        setFavoritePrices(grouped);
      }
    } catch (err) {
      console.error('Error fetching favorite prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavoritePrices();
    }
  }, [activeTab, favorites]);

  const getItemName = (id: string) => {
    const item = POPULAR_ITEMS.find(i => i.id === id);
    if (!item) return id;
    
    if (language === 'pt') return item.name;
    
    // If English name is explicitly provided in the object
    if ((item as any).name_en) return (item as any).name_en;
    
    // Fallback: Basic translation logic for patterns
    let name = item.name;
    
    // Tiers mapping
    const tiers: Record<string, string> = {
      'T1': 'Beginner', 'T2': 'Novice', 'T3': 'Journeyman',
      'T4': 'Adept', 'T5': 'Expert', 'T6': 'Master',
      'T7': 'Grandmaster', 'T8': 'Elder'
    };
    
    // Common prefixes/items
    const mapping: Record<string, string> = {
      'Bolsa do Recruta': "Adept's Bag",
      'Bolsa do Especialista': "Expert's Bag",
      'Bolsa do Perito': "Master's Bag",
      'Bolsa do Mestre': "Grandmaster's Bag",
      'Bolsa do Grão-Mestre': "Elder's Bag",
      'Capa do Recruta': "Adept's Cape",
      'Capa do Especialista': "Expert's Cape",
      'Capa do Perito': "Master's Cape",
      'Capa do Mestre': "Grandmaster's Cape",
      'Capa do Grão-Mestre': "Elder's Cape",
      'Cavalo de Montaria': 'Riding Horse',
      'Boi de Transporte': 'Transport Ox',
      'Elmo de Soldado': 'Soldier Helmet',
      'Armadura de Soldado': 'Soldier Armor',
      'Botas de Soldado': 'Soldier Boots',
      'Espada Larga': 'Broadsword',
      'Machado de Batalha': 'Battleaxe',
      'Cajado de Fogo': 'Fire Staff',
      'Cajado Sagrado': 'Holy Staff',
      'Cajado da Natureza': 'Nature Staff',
      'Capuz do Estudioso': 'Scholar Cowl',
      'Robe do Estudioso': 'Scholar Robe',
      'Sandálias do Estudioso': 'Scholar Sandals',
      'Capuz do Clérigo': 'Cleric Cowl',
      'Robe do Clérigo': 'Cleric Robe',
      'Sandálias do Clérigo': 'Cleric Sandals',
      'Capuz do Mago': 'Mage Cowl',
      'Robe do Mago': 'Mage Robe',
      'Sandálias do Mago': 'Mage Sandals',
      'Capuz do Mercenário': 'Mercenary Hood',
      'Jaqueta do Mercenário': 'Mercenary Jacket',
      'Sapatos do Mercenário': 'Mercenary Shoes',
      'Capuz do Assassino': 'Assassin Hood',
      'Jaqueta do Assassino': 'Assassin Jacket',
      'Sapatos do Assassino': 'Assassin Shoes',
      'Capuz do Caçador': 'Hunter Hood',
      'Jaqueta do Caçador': 'Hunter Jacket',
      'Sapatos do Caçador': 'Hunter Shoes',
      'Elmo do Soldado': 'Soldier Helmet',
      'Armadura do Soldado': 'Soldier Armor',
      'Botas do Soldado': 'Soldier Boots',
      'Elmo do Cavaleiro': 'Knight Helmet',
      'Armadura do Cavaleiro': 'Knight Armor',
      'Botas do Cavaleiro': 'Knight Boots',
      'Elmo do Guardião': 'Guardian Helmet',
      'Armadura do Guardião': 'Guardian Armor',
      'Botas do Guardião': 'Guardian Boots',
      'Espada Esculpidora': 'Carving Sword',
      'Chamado da Carniça': 'Carrioncaller',
      'Maça de Pedra': 'Bedrock Mace',
      'Juramentadores': 'Oathkeepers',
      'Martelo Grande': 'Great Hammer',
      'Martelos da Forja': 'Forge Hammers',
      'Pique': 'Pike',
      'Caçador Espiritual': 'Spirithunter',
      'Cajado Bruxesco': 'Witchwork Staff',
      'Cajado Oculto': 'Occult Staff',
      'Canção Eterna': 'Evensong',
      'Fogo Selvagem': 'Wildfire Staff',
      'Brimstone': 'Brimstone Staff',
      'Chama Ardente': 'Blazing Staff',
      'Geada': 'Hoarfrost Staff',
      'Permafrost': 'Permafrost Prism',
      'Cajado da Maldição Vital': 'Lifecurse Staff',
      'Danação': 'Damnation Staff',
      'Chamador das Sombras': 'Shadowcaller',
      'Cajado Druídico': 'Druidic Staff',
      'Cajado da Praga': 'Blight Staff',
      'Hallowfall': 'Hallowfall',
      'Arco Uivante': 'Wailing Bow',
      'Lançadores de Parafusos': 'Boltcasters',
      'Canino Demoníaco': 'Demonfang',
      'Buscador do Graal': 'Grailseeker',
      'Golpe do Corvo': 'Ravenstrike Cestus',
      'Capuz Real de Couro': 'Royal Cowl',
      'Jaqueta Real': 'Royal Jacket',
      'Sapatos Reais de Couro': 'Royal Shoes',
      'Elmo Real': 'Royal Helmet',
      'Armadura Real': 'Royal Armor',
      'Botas Reais': 'Royal Boots',
      'Capa Avaloniana': 'Avalonian Cape',
      'Capa Morgana': 'Morgana Cape',
      'Capa Demoníaca': 'Demon Cape',
      'Capa Morta-Viva': 'Undead Cape',
      'Capa de Cristal': 'Crystal Cape',
      'Saco de Conhecimento': 'Satchel of Insight',
      'Escudo': 'Shield',
      'Tocha': 'Torch',
      'Tomo de Feitiços': 'Tome of Spells'
    };

    for (const [pt, en] of Object.entries(mapping)) {
      if (name.includes(pt)) {
        name = name.replace(pt, en);
        break;
      }
    }

    // Replace Tiers in parentheses
    Object.entries(tiers).forEach(([ptTier, enTier]) => {
      name = name.replace(`(${ptTier})`, `(${enTier} ${ptTier})`);
      name = name.replace(`(${ptTier}.1)`, `(${enTier} ${ptTier}.1)`);
      name = name.replace(`(${ptTier}.2)`, `(${enTier} ${ptTier}.2)`);
      name = name.replace(`(${ptTier}.3)`, `(${enTier} ${ptTier}.3)`);
    });

    return name;
  };

  const isEquipment = (id: string) => {
    const equipmentKeywords = ['BAG', 'CAPE', 'MOUNT', 'HEAD', 'ARMOR', 'SHOES', 'MAIN', '2H', 'OFF', 'KNUCKLES'];
    const isArtifact = id.includes('ARTEFACT');
    const hasEquipmentKeyword = equipmentKeywords.some(kw => id.includes(kw));
    return hasEquipmentKeyword && !isArtifact;
  };

  const filteredItems = useMemo(() => {
    return POPULAR_ITEMS.filter(item => isEquipment(item.id));
  }, []);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const meetsProfit = opp.profit >= minProfit;
      if (!meetsProfit) return false;
      
      if (tierFilter === 'all') return true;
      
      const tierMatch = opp.item_id.match(/^T(\d)/);
      if (!tierMatch) return true;
      
      const tier = parseInt(tierMatch[1]);
      if (tierFilter === '6-') return tier <= 6;
      if (tierFilter === '6+') return tier >= 6;
      
      return true;
    });
  }, [opportunities, minProfit, tierFilter]);

  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch('https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Caerleon');
        setApiOnline(res.ok);
      } catch {
        setApiOnline(false);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async (targetId?: string) => {
    const idToFetch = (targetId || itemId).trim();
    if (!idToFetch) return;

    setLoading(true);
    setError(null);
    setAvgVolume(null);
    
    try {
      let formattedId = idToFetch.toUpperCase();
      formattedId = formattedId.replace(/\.(\d)$/, '@$1');
      
      const apiLocations = CITIES.map(c => c.replace(/\s/g, '')).join(',');
      
      // Fetch Current Prices
      const priceUrl = `https://west.albion-online-data.com/api/v2/stats/prices/${formattedId}.json?locations=${apiLocations}&qualities=1,2,3`;
      
      // Fetch History (Volume)
      const historyUrl = `https://west.albion-online-data.com/api/v2/stats/history/${formattedId}.json?locations=${apiLocations}&time-scale=24`;
      
      const [priceRes, historyRes] = await Promise.all([
        fetch(priceUrl),
        fetch(historyUrl)
      ]);

      if (!priceRes.ok) throw new Error('Falha ao buscar preços.');
      
      const rawPriceData: PriceData[] = await priceRes.json();
      
      // Merge qualities per city
      const mergedPrices: Record<string, PriceData> = {};
      rawPriceData.forEach(curr => {
        const cityKey = curr.city.toLowerCase();
        if (!mergedPrices[cityKey]) {
          mergedPrices[cityKey] = { ...curr };
        } else {
          if (curr.sell_price_min > 0 && (mergedPrices[cityKey].sell_price_min === 0 || curr.sell_price_min < mergedPrices[cityKey].sell_price_min)) {
            mergedPrices[cityKey].sell_price_min = curr.sell_price_min;
            mergedPrices[cityKey].sell_price_min_date = curr.sell_price_min_date;
          }
          if (curr.buy_price_max > 0 && (mergedPrices[cityKey].buy_price_max === 0 || curr.buy_price_max > mergedPrices[cityKey].buy_price_max)) {
            mergedPrices[cityKey].buy_price_max = curr.buy_price_max;
            mergedPrices[cityKey].buy_price_max_date = curr.buy_price_max_date;
          }
        }
      });

      const priceData = Object.values(mergedPrices);
      
      if (!priceData || priceData.length === 0) {
        setError('Nenhum dado encontrado para este item.');
        setPrices([]);
      } else {
        setPrices(priceData);
        setSearchedItem(formattedId);
        
        // Process Volume if history exists
        if (historyRes.ok) {
          const historyData: HistoryData[] = await historyRes.json();
          let totalVolumeLast3Days = 0;
          let daysFound = 0;

          // We sum volume across all locations for the last 3 days
          historyData.forEach(locData => {
            // Sort data by timestamp descending
            const sortedHistory = [...locData.data].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            // Take up to 3 most recent entries
            const last3 = sortedHistory.slice(0, 3);
            last3.forEach(entry => {
              totalVolumeLast3Days += entry.item_count;
            });
            if (last3.length > 0) daysFound = Math.max(daysFound, last3.length);
          });

          if (daysFound > 0) {
            setAvgVolume(Math.round(totalVolumeLast3Days / 3));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado.');
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const scanOpportunities = async () => {
    setScanning(true);
    setError(null);
    try {
      // Pick a subset of items to scan to avoid huge payloads
      // We'll scan 250 popular items
      const itemsToScan = filteredItems.slice(0, 250);
      const itemIds = itemsToScan.map(i => i.id).join(',');
      const apiLocations = CITIES.map(c => c.replace(/\s/g, '')).join(',');
      const url = `https://west.albion-online-data.com/api/v2/stats/prices/${itemIds}.json?locations=${apiLocations}&qualities=1,2,3`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao escanear oportunidades.');
      
      const priceData: PriceData[] = await response.json();
      
      // Fetch History for the same items to get volume
      const historyUrl = `https://west.albion-online-data.com/api/v2/stats/history/${itemIds}.json?locations=${apiLocations}&time-scale=24`;
      const historyRes = await fetch(historyUrl);
      const historyData: HistoryData[] = historyRes.ok ? await historyRes.json() : [];

      const foundOpportunities: Opportunity[] = [];
      
      // Process History to get volumes per item
      const itemVolumes: Record<string, number> = {};
      historyData.forEach(locData => {
        const sortedHistory = [...locData.data].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        const last3 = sortedHistory.slice(0, 3);
        const vol = last3.reduce((sum, entry) => sum + entry.item_count, 0);
        if (!itemVolumes[locData.item_id]) itemVolumes[locData.item_id] = 0;
        itemVolumes[locData.item_id] += Math.round(vol / 3);
      });

      // Group by item
      const grouped = priceData.reduce((acc, curr) => {
        if (!acc[curr.item_id]) acc[curr.item_id] = [];
        acc[curr.item_id].push(curr);
        return acc;
      }, {} as Record<string, PriceData[]>);

      Object.entries(grouped).forEach(([id, itemPrices]) => {
        const validSell = itemPrices.filter(p => p.sell_price_min > 0 && buyCities.includes(p.city));
        const validBuy = itemPrices.filter(p => p.buy_price_max > 0 && sellCities.includes(p.city));

        if (validSell.length > 0 && validBuy.length > 0) {
          const bestBuy = validSell.reduce((prev, curr) => prev.sell_price_min < curr.sell_price_min ? prev : curr);
          const bestSell = validBuy.reduce((prev, curr) => prev.buy_price_max > curr.buy_price_max ? prev : curr);

          const profit = bestSell.buy_price_max - bestBuy.sell_price_min;
          if (profit > 0) {
            const itemName = getItemName(id);
            foundOpportunities.push({
              item_id: id,
              item_name: itemName,
              buy_city: bestBuy.city,
              buy_price: bestBuy.sell_price_min,
              buy_updated: bestBuy.sell_price_min_date,
              sell_city: bestSell.city,
              sell_price: bestSell.buy_price_max,
              sell_updated: bestSell.buy_price_max_date,
              profit,
              profit_percent: (profit / bestBuy.sell_price_min) * 100,
              avg_volume: itemVolumes[id] || null
            });
          }
        }
      });

      setOpportunities(foundOpportunities.sort((a, b) => {
        const confA = getConfidence(a.buy_updated, a.sell_updated);
        const confB = getConfidence(b.buy_updated, b.sell_updated);
        
        if (confA.score !== confB.score) return confB.score - confA.score;
        return b.profit - a.profit;
      }));
      setLastScanTime(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao escanear.');
    } finally {
      setScanning(false);
    }
  };

  const { minSell, maxBuy, maxSell, arbitrage, transport } = useMemo(() => {
    const validSellPrices = prices.filter(p => p.sell_price_min > 0);
    const validBuyPrices = prices.filter(p => p.buy_price_max > 0);
    
    let minS = null;
    let maxB = null;
    let maxS = null;

    if (validSellPrices.length > 0) {
      minS = validSellPrices.reduce((prev, curr) => 
        prev.sell_price_min < curr.sell_price_min ? prev : curr
      );
      maxS = validSellPrices.reduce((prev, curr) => 
        prev.sell_price_min > curr.sell_price_min ? prev : curr
      );
    }

    if (validBuyPrices.length > 0) {
      maxB = validBuyPrices.reduce((prev, curr) => 
        prev.buy_price_max > curr.buy_price_max ? prev : curr
      );
    }

    const instantProfit = (minS && maxB) ? maxB.buy_price_max - minS.sell_price_min : null;
    const transportProfit = (minS && maxS) ? maxS.sell_price_min - minS.sell_price_min : null;

    return { minSell: minS, maxBuy: maxB, maxSell: maxS, arbitrage: instantProfit, transport: transportProfit };
  }, [prices]);

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.startsWith('0001')) return t.noRecentData;
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return price > 0 ? price.toLocaleString('en-US') : '---';
  };

  const getConfidence = (buyDate: string, sellDate: string) => {
    const now = new Date().getTime();
    const bDate = new Date(buyDate).getTime();
    const sDate = new Date(sellDate).getTime();
    
    // Get the oldest update time
    const oldest = Math.min(bDate, sDate);
    const diffHours = (now - oldest) / (1000 * 60 * 60);

    if (diffHours < 1) return { 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-500', 
      border: 'border-emerald-500/20', 
      label: t.safe,
      score: 3
    };
    if (diffHours < 4) return { 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-500', 
      border: 'border-amber-500/20', 
      label: t.medium,
      score: 2
    };
    return { 
      bg: 'bg-red-500/10', 
      text: 'text-red-500', 
      border: 'border-red-500/20', 
      label: t.risk,
      score: 1
    };
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header / Hero */}
      <header className="border-b border-white/5 bg-[#0f0f0f]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <TrendingUp className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Albion Radar</h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'search' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t.searchTab}
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'opportunities' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t.oppTab}
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'favorites' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t.favTab}
            </button>
          </div>
        </div>

          {activeTab === 'search' && (
            <form 
              onSubmit={(e) => { e.preventDefault(); fetchPrices(); }} 
              className="flex w-full sm:w-auto gap-2"
            >
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  list="item-list"
                  placeholder={t.searchPlaceholder}
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-zinc-600"
                />
                <datalist id="item-list">
                  {filteredItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </datalist>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.searchBtn}
              </button>
              {searchedItem && (
                <button
                  type="button"
                  onClick={() => fetchPrices(searchedItem)}
                  disabled={loading}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors border border-white/5"
                  title={t.refreshBtn}
                >
                  <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </form>
          )}

          {activeTab === 'opportunities' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${apiOnline === null ? 'bg-zinc-500' : apiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">API {apiOnline === null ? '...' : apiOnline ? t.apiOnline : t.apiOffline}</span>
              </div>
              
              {lastScanTime && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg text-[10px] text-zinc-500 font-mono">
                  <Clock className="w-3 h-3" />
                  {lastScanTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div
              key="search-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {!searchedItem && !loading && !error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                    <Info className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h2 className="text-2xl font-light text-zinc-400 mb-2">{t.readyToSearch}</h2>
                  <p className="text-zinc-600 max-w-md">
                    {t.searchDesc}
                  </p>

                  <div className="mt-8 flex items-center gap-2 p-1 bg-zinc-900/50 border border-white/5 rounded-xl">
                    <button
                      onClick={() => setLanguage('pt')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${language === 'pt' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      PT-BR
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${language === 'en' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      EN-US
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {filteredItems.slice(0, 8).map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setItemId(item.id); fetchPrices(item.id); }}
                          className="flex items-center gap-3 px-3 py-2 bg-zinc-900/30 border border-white/5 rounded-lg text-xs text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all text-left group"
                        >
                          <img 
                            src={`https://render.albiononline.com/v1/item/${item.id}.png`} 
                            alt={item.id}
                            className="w-8 h-8 object-contain opacity-50 group-hover:opacity-100 transition-opacity"
                            referrerPolicy="no-referrer"
                          />
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-start gap-4 mb-8">
                  <AlertCircle className="text-red-500 shrink-0 w-6 h-6" />
                  <div>
                    <h3 className="text-red-500 font-semibold mb-1">{t.searchError}</h3>
                    <p className="text-red-200/70 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {searchedItem && (
                <div className="space-y-6">
                  {/* Best Deal Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/50 border border-emerald-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <ShoppingCart className="w-4 h-4" />
                        {t.bestBuy}
                      </div>
                      {minSell ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">{minSell.city}</div>
                          <div className="text-emerald-400 font-mono text-lg">{formatPrice(minSell.sell_price_min)} <span className="text-xs opacity-60">{t.silver}</span></div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">{t.noData}</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-blue-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <DollarSign className="w-4 h-4" />
                        {t.bestSell}
                      </div>
                      {maxBuy ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">{maxBuy.city}</div>
                          <div className="text-blue-400 font-mono text-lg">{formatPrice(maxBuy.buy_price_max)} <span className="text-xs opacity-60">{t.silver}</span></div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">{t.noData}</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-amber-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <TrendingUp className="w-4 h-4" />
                        {t.flipProfit}
                      </div>
                      {arbitrage !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {arbitrage > 0 ? t.opportunity : t.noProfit}
                          </div>
                          <div className={`font-mono text-lg ${arbitrage > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                            {formatPrice(arbitrage)} <span className="text-xs opacity-60">{t.silver}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">{t.insufficientData}</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-purple-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-purple-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <ArrowRight className="w-4 h-4" />
                        {t.transportProfit}
                      </div>
                      {transport !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {transport > 0 ? t.opportunity : t.noProfit}
                          </div>
                          <div className={`font-mono text-lg ${transport > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
                            {formatPrice(transport)} <span className="text-xs opacity-60">{t.silver}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">{t.insufficientData}</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
                        <TrendingUp className="w-4 h-4" />
                        {t.dailyVolume}
                      </div>
                      {avgVolume !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {avgVolume.toLocaleString()}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            {t.salesPerDay}
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">{t.noVolumeData}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-b border-white/5 pb-4">
                    <div>
                      <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-1 block">{t.resultsFor}</span>
                      <div className="flex items-center gap-4">
                        <img 
                          src={`https://render.albiononline.com/v1/item/${searchedItem}.png`} 
                          alt={searchedItem}
                          className="w-16 h-16 object-contain bg-zinc-900/50 rounded-lg border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                        <h2 className="text-3xl font-bold text-white tracking-tight">{getItemName(searchedItem)}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleFavorite(searchedItem)}
                        className={`p-2 rounded-lg border transition-all ${favorites.includes(searchedItem) ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(searchedItem) ? 'fill-amber-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => { setSearchedItem(''); setPrices([]); setItemId(''); setError(null); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
                      >
                        {t.clear}
                      </button>
                    </div>
                  </div>

                  {/* Price Grid */}
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/50 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                            <th className="px-6 py-4 border-b border-white/5">{t.city}</th>
                            <th className="px-6 py-4 border-b border-white/5 group relative cursor-help">
                              {t.sellPrice}
                              <div className="absolute hidden group-hover:block bg-zinc-800 text-white p-2 rounded text-[9px] normal-case tracking-normal w-40 z-20 top-full left-0 mt-1 shadow-xl border border-white/10">
                                Preço mínimo que os jogadores estão pedindo para vender o item.
                              </div>
                            </th>
                            <th className="px-6 py-4 border-b border-white/5 group relative cursor-help">
                              {t.buyPrice}
                              <div className="absolute hidden group-hover:block bg-zinc-800 text-white p-2 rounded text-[9px] normal-case tracking-normal w-40 z-20 top-full left-0 mt-1 shadow-xl border border-white/10">
                                Preço máximo que os jogadores estão oferecendo para comprar o item.
                              </div>
                            </th>
                            <th className="px-6 py-4 border-b border-white/5">{t.lastUpdate}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {CITIES.map(city => {
                            const data = prices.find(p => p.city.replace(/\s/g, '').toLowerCase() === city.replace(/\s/g, '').toLowerCase());
                            const isMinSell = data && minSell && data.city === minSell.city && data.sell_price_min > 0;
                            const isMaxBuy = data && maxBuy && data.city === maxBuy.city && data.buy_price_max > 0;

                            return (
                              <tr key={city} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-zinc-700 transition-colors ${city === 'Black Market' ? 'bg-amber-900/30 text-amber-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                      <MapPin className="w-4 h-4" />
                                    </div>
                                    <span className={`font-semibold ${city === 'Black Market' ? 'text-amber-200' : 'text-zinc-200'}`}>{city}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono text-lg ${isMinSell ? 'text-emerald-400 font-bold' : 'text-zinc-300'}`}>
                                      {data ? formatPrice(data.sell_price_min) : '---'}
                                    </span>
                                    {isMinSell && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono text-lg ${isMaxBuy ? 'text-blue-400 font-bold' : 'text-zinc-400'}`}>
                                      {data ? formatPrice(data.buy_price_max) : '---'}
                                    </span>
                                    {isMaxBuy && <TrendingUp className="w-4 h-4 text-blue-400" />}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="w-3 h-3" />
                                    {data ? formatDate(data.sell_price_min_date) : t.noRecentData}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'opportunities' && (
            <motion.div
              key="opportunities-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{t.marketOpp}</h2>
                    <p className="text-xs text-zinc-500 mt-1">{t.oppDesc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {filteredOpportunities.length > 0 && (
                      <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {filteredOpportunities.length} {t.found}
                      </span>
                    )}
                    <button
                      onClick={scanOpportunities}
                      disabled={scanning}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {t.scan}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{t.buyAt}</label>
                      <div className="flex flex-wrap gap-2">
                        {CITIES.map(city => (
                          <button
                            key={`buy-${city}`}
                            onClick={() => {
                              setBuyCities(prev => 
                                prev.includes(city) 
                                  ? prev.filter(c => c !== city) 
                                  : [...prev, city]
                              );
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                              buyCities.includes(city)
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-950 border-white/10 text-zinc-500 hover:border-white/20'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{t.sellAt}</label>
                      <div className="flex flex-wrap gap-2">
                        {CITIES.map(city => (
                          <button
                            key={`sell-${city}`}
                            onClick={() => {
                              setSellCities(prev => 
                                prev.includes(city) 
                                  ? prev.filter(c => c !== city) 
                                  : [...prev, city]
                              );
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all ${
                              sellCities.includes(city)
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                : 'bg-zinc-950 border-white/10 text-zinc-500 hover:border-white/20'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{t.filterTier}</label>
                      <div className="flex gap-2">
                        {(['all', '6-', '6+'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setTierFilter(f)}
                            className={`flex-1 py-1.5 rounded text-[10px] font-bold border transition-all ${
                              tierFilter === f
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                                : 'bg-zinc-950 border-white/10 text-zinc-500 hover:border-white/20'
                            }`}
                          >
                            {f === 'all' ? t.all : f === '6-' ? 'TIER 6-' : 'TIER 6+'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{t.minProfit}</label>
                        <span className="text-xs font-mono text-emerald-400">{formatPrice(minProfit)} Silver</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="200000" 
                        step="1000"
                        value={minProfit}
                        onChange={(e) => setMinProfit(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-white/5"
                      />
                      <div className="flex justify-between text-[8px] text-zinc-600 font-mono">
                        <span>0</span>
                        <span>50k</span>
                        <span>100k</span>
                        <span>150k</span>
                        <span>200k</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {filteredOpportunities.length === 0 && !scanning && opportunities.length > 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                    <Filter className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h2 className="text-2xl font-light text-zinc-400 mb-2">{t.noOppProfit}</h2>
                  <p className="text-zinc-600 max-w-md mb-8">
                    {t.lowerFilter}
                  </p>
                </div>
              )}

              {opportunities.length === 0 && !scanning && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                    <Zap className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h2 className="text-2xl font-light text-zinc-400 mb-2">{t.noOppLoaded}</h2>
                  <p className="text-zinc-600 max-w-md mb-8">
                    {t.clickScan}
                  </p>
                </div>
              )}

              {scanning && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                  <h3 className="text-xl font-semibold text-white">{t.scanning}</h3>
                  <p className="text-zinc-500 text-sm mt-2">{t.scanWait}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpportunities.map((opp, idx) => (
                  <motion.div
                    key={opp.item_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://render.albiononline.com/v1/item/${opp.item_id}.png`} 
                          alt={opp.item_id}
                          className="w-12 h-12 object-contain bg-zinc-900/50 rounded-lg border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{opp.item_name}</h3>
                          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{opp.item_id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(opp.item_id)}
                          className={`p-1.5 rounded-lg border transition-all ${favorites.includes(opp.item_id) ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                        >
                          <Star className={`w-3 h-3 ${favorites.includes(opp.item_id) ? 'fill-amber-500' : ''}`} />
                        </button>
                        {(() => {
                          const conf = getConfidence(opp.buy_updated, opp.sell_updated);
                          const label = conf.label === 'Seguro' ? t.safe : conf.label === 'Mediano' ? t.medium : t.risk;
                          return (
                            <div 
                              className={`text-[10px] font-bold px-2 py-1 rounded border ${conf.bg} ${conf.text} ${conf.border}`}
                              title={`Dados de até ${Math.round((new Date().getTime() - Math.min(new Date(opp.buy_updated).getTime(), new Date(opp.sell_updated).getTime())) / (1000 * 60 * 60))}h atrás`}
                            >
                              {label}
                            </div>
                          );
                        })()}
                        <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20">
                          +{opp.profit_percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <ShoppingCart className="w-3 h-3" />
                          {t.buyIn} <span className="text-zinc-200 font-semibold">{opp.buy_city}</span>
                        </div>
                        <span className="font-mono text-emerald-400">{formatPrice(opp.buy_price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <DollarSign className="w-3 h-3" />
                          {t.sellIn} <span className="text-zinc-200 font-semibold">{opp.sell_city}</span>
                        </div>
                        <span className="font-mono text-blue-400">{formatPrice(opp.sell_price)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">{t.volume3d}</span>
                        <span className="font-mono text-zinc-400 text-xs">{opp.avg_volume?.toLocaleString() || '---'} / dia</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">{t.estProfit}</span>
                        <span className="font-mono text-amber-400 font-bold">{formatPrice(opp.profit)}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => { setItemId(opp.item_id); fetchPrices(opp.item_id); setActiveTab('search'); }}
                      className="w-full mt-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-white/5"
                    >
                      {t.viewDetails}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{t.favTab}</h2>
                    <p className="text-xs text-zinc-500 mt-1">{t.addFavs}</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={fetchFavoritePrices}
                      disabled={loading}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 p-4 rounded-xl border border-white/5 transition-all flex items-center justify-center"
                      title={t.refreshBtn}
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="bg-zinc-950 border border-white/5 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">{t.totalInvestment}</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">
                        {(() => {
                          let total = 0;
                          favorites.forEach(id => {
                            const qty = favoriteQuantities[id] || 0;
                            const itemPrices = favoritePrices[id] || [];
                            const bestBuy = itemPrices.filter(p => p.sell_price_min > 0).reduce((prev, curr) => (!prev || curr.sell_price_min < prev.sell_price_min) ? curr : prev, null as PriceData | null);
                            if (bestBuy) total += bestBuy.sell_price_min * qty;
                          });
                          return formatPrice(total);
                        })()}
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-white/5 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">{t.totalReturn}</div>
                      <div className="text-xl font-bold text-blue-400 font-mono">
                        {(() => {
                          let total = 0;
                          favorites.forEach(id => {
                            const qty = favoriteQuantities[id] || 0;
                            const itemPrices = favoritePrices[id] || [];
                            const bmPrice = itemPrices.find(p => p.city === 'Black Market');
                            if (bmPrice && bmPrice.buy_price_max > 0) total += bmPrice.buy_price_max * qty;
                          });
                          return formatPrice(total);
                        })()}
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-white/5 p-4 rounded-xl">
                      <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">{t.totalProfit}</div>
                      <div className="text-xl font-bold text-amber-400 font-mono">
                        {(() => {
                          let totalInvestment = 0;
                          let totalReturn = 0;
                          favorites.forEach(id => {
                            const qty = favoriteQuantities[id] || 0;
                            const itemPrices = favoritePrices[id] || [];
                            const bestBuy = itemPrices.filter(p => p.sell_price_min > 0).reduce((prev, curr) => (!prev || curr.sell_price_min < prev.sell_price_min) ? curr : prev, null as PriceData | null);
                            const bmPrice = itemPrices.find(p => p.city === 'Black Market');
                            
                            if (bestBuy) totalInvestment += bestBuy.sell_price_min * qty;
                            if (bmPrice && bmPrice.buy_price_max > 0) totalReturn += bmPrice.buy_price_max * qty;
                          });
                          return formatPrice(totalReturn - totalInvestment);
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                      <Star className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h2 className="text-2xl font-light text-zinc-400 mb-2">{t.noFavs}</h2>
                    <p className="text-zinc-600 max-w-md">{t.addFavs}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {favorites.map(id => {
                      const itemPrices = favoritePrices[id] || [];
                      const bestBuy = itemPrices.filter(p => p.sell_price_min > 0).reduce((prev, curr) => (!prev || curr.sell_price_min < prev.sell_price_min) ? curr : prev, null as PriceData | null);
                      const bmPrice = itemPrices.find(p => p.city === 'Black Market');
                      const qty = favoriteQuantities[id] || 0;
                      const investment = bestBuy ? bestBuy.sell_price_min * qty : 0;
                      const returns = (bmPrice && bmPrice.buy_price_max > 0) ? bmPrice.buy_price_max * qty : 0;
                      const profit = returns - investment;
                      const conf = (bestBuy && bmPrice) ? getConfidence(bestBuy.sell_price_min_date, bmPrice.buy_price_max_date) : null;

                      return (
                        <div key={id} className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row items-center gap-6">
                          <div className="flex items-center gap-4 flex-1 w-full">
                            <img 
                              src={`https://render.albiononline.com/v1/item/${id}.png`} 
                              alt={id}
                              className="w-12 h-12 object-contain bg-zinc-900/50 rounded-lg border border-white/5"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-white truncate">{getItemName(id)}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">{id}</span>
                                {conf && (
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${conf.bg} ${conf.text} ${conf.border}`}>
                                    {conf.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">{t.quantity}</label>
                              <input 
                                type="number" 
                                value={qty} 
                                onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 0)}
                                className="w-20 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm font-mono text-white focus:border-emerald-500 outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">{t.buyPriceFav}</label>
                              <div className="text-sm font-mono text-emerald-400">
                                {bestBuy ? formatPrice(bestBuy.sell_price_min) : '---'}
                              </div>
                              <div className="text-[8px] text-zinc-600">{bestBuy?.city}</div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">{t.sellPriceBM}</label>
                              <div className="text-sm font-mono text-blue-400">
                                {bmPrice && bmPrice.buy_price_max > 0 ? formatPrice(bmPrice.buy_price_max) : '---'}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] uppercase font-bold text-zinc-600 tracking-wider">{t.totalProfit}</label>
                              <div className={`text-sm font-mono font-bold ${profit > 0 ? 'text-amber-400' : profit < 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                                {formatPrice(profit)}
                              </div>
                              {investment > 0 && (
                                <div className="text-[8px] text-zinc-500 font-mono">
                                  ROI: {((profit / investment) * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => toggleFavorite(id)}
                              className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Powered by AlissonJM</p>
          <p className="text-zinc-700 text-[10px] max-w-lg mx-auto leading-relaxed">
            {t.footerDesc}
          </p>
          <p className="mt-4 text-[9px] text-zinc-800 uppercase tracking-tighter">
            {t.databaseDesc.replace('{count}', POPULAR_ITEMS.length.toString())}
          </p>
        </div>
      </footer>
    </div>
  );
}
