/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Clock, MapPin, AlertCircle, Loader2, Info, ArrowRight, DollarSign, ShoppingCart, Zap, RefreshCw } from 'lucide-react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'opportunities'>('search');
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
  const [showOnlyEquipment, setShowOnlyEquipment] = useState(false);
  const [minProfit, setMinProfit] = useState(0);

  const isEquipment = (id: string) => {
    const equipmentKeywords = ['BAG', 'CAPE', 'MOUNT', 'HEAD', 'ARMOR', 'SHOES', 'MAIN', '2H', 'OFF', 'KNUCKLES'];
    const isArtifact = id.includes('ARTEFACT');
    const hasEquipmentKeyword = equipmentKeywords.some(kw => id.includes(kw));
    return hasEquipmentKeyword && !isArtifact;
  };

  const filteredItems = useMemo(() => {
    if (!showOnlyEquipment) return POPULAR_ITEMS;
    return POPULAR_ITEMS.filter(item => isEquipment(item.id));
  }, [showOnlyEquipment]);

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
      const priceUrl = `https://west.albion-online-data.com/api/v2/stats/prices/${formattedId}.json?locations=${apiLocations}&qualities=1`;
      
      // Fetch History (Volume)
      const historyUrl = `https://west.albion-online-data.com/api/v2/stats/history/${formattedId}.json?locations=${apiLocations}&time-scale=24`;
      
      const [priceRes, historyRes] = await Promise.all([
        fetch(priceUrl),
        fetch(historyUrl)
      ]);

      if (!priceRes.ok) throw new Error('Falha ao buscar preços.');
      
      const priceData: PriceData[] = await priceRes.json();
      
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
      const url = `https://west.albion-online-data.com/api/v2/stats/prices/${itemIds}.json?locations=${apiLocations}&qualities=1`;

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
            const itemName = POPULAR_ITEMS.find(i => i.id === id)?.name || id;
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
        
        const score = { 'Seguro': 3, 'Mediano': 2, 'Risco': 1 };
        const scoreA = score[confA.label as keyof typeof score] || 0;
        const scoreB = score[confB.label as keyof typeof score] || 0;
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.profit_percent - a.profit_percent;
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
    if (!dateStr || dateStr.startsWith('0001')) return 'Sem dados recentes';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
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
      label: 'Seguro' 
    };
    if (diffHours < 4) return { 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-500', 
      border: 'border-amber-500/20', 
      label: 'Mediano' 
    };
    return { 
      bg: 'bg-red-500/10', 
      text: 'text-red-500', 
      border: 'border-red-500/20', 
      label: 'Risco' 
    };
  };

  const getItemName = (id: string) => {
    return POPULAR_ITEMS.find(i => i.id === id)?.name || id;
  };

  const getItemIcon = (id: string) => {
    return `https://render.albiononline.com/v1/item/${id}.png`;
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
              <h1 className="text-xl font-bold tracking-tight text-white">Radar Albion</h1>
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Arbitrage & Price Tracker • <span className="text-emerald-500/80">POWERED BY AJM</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOnlyEquipment(!showOnlyEquipment)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                showOnlyEquipment 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                  : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              {showOnlyEquipment ? 'Apenas Equipamentos' : 'Todos os Itens'}
            </button>

            <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'search' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Consulta
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'opportunities' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Oportunidades
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
                  placeholder="Nome ou ID do item..."
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
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>
              {searchedItem && (
                <button
                  type="button"
                  onClick={() => fetchPrices(searchedItem)}
                  disabled={loading}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg transition-colors border border-white/5"
                  title="Atualizar preços"
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
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">API {apiOnline === null ? '...' : apiOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {lastScanTime && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg text-[10px] text-zinc-500 font-mono">
                  <Clock className="w-3 h-3" />
                  {lastScanTime.toLocaleTimeString()}
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setOpportunities([]);
                    setLastScanTime(null);
                  }}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors border border-white/5"
                  title="Limpar Resultados"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={scanOpportunities}
                  disabled={scanning}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Escanear
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'search' ? (
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
                  <h2 className="text-2xl font-light text-zinc-400 mb-2">Pronto para consultar?</h2>
                  <p className="text-zinc-600 max-w-md">
                    Digite o ID técnico do item acima para ver os preços em tempo real e encontrar oportunidades de lucro.
                  </p>
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {filteredItems.slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setItemId(item.id); fetchPrices(item.id); }}
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-900/30 border border-white/5 rounded-md text-xs text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-all text-left"
                      >
                        <img 
                          src={getItemIcon(item.id)} 
                          alt="" 
                          className="w-6 h-6 object-contain"
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
                    <h3 className="text-red-500 font-semibold mb-1">Erro na busca</h3>
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
                        Melhor COMPRA
                      </div>
                      {minSell ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">{minSell.city}</div>
                          <div className="text-emerald-400 font-mono text-lg">{formatPrice(minSell.sell_price_min)} <span className="text-xs opacity-60">Prata</span></div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">Sem dados</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-blue-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <DollarSign className="w-4 h-4" />
                        Melhor VENDA
                      </div>
                      {maxBuy ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">{maxBuy.city}</div>
                          <div className="text-blue-400 font-mono text-lg">{formatPrice(maxBuy.buy_price_max)} <span className="text-xs opacity-60">Prata</span></div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">Sem dados</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-amber-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <TrendingUp className="w-4 h-4" />
                        Lucro Flip
                      </div>
                      {arbitrage !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {arbitrage > 0 ? 'Oportunidade!' : 'Sem Lucro'}
                          </div>
                          <div className={`font-mono text-lg ${arbitrage > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                            {formatPrice(arbitrage)} <span className="text-xs opacity-60">Prata</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">Dados insuficientes</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-purple-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-purple-500 text-xs font-bold uppercase tracking-wider mb-3">
                        <ArrowRight className="w-4 h-4" />
                        Lucro Transporte
                      </div>
                      {transport !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {transport > 0 ? 'Oportunidade!' : 'Sem Lucro'}
                          </div>
                          <div className={`font-mono text-lg ${transport > 0 ? 'text-purple-400' : 'text-zinc-500'}`}>
                            {formatPrice(transport)} <span className="text-xs opacity-60">Prata</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">Dados insuficientes</div>
                      )}
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-500/20 p-5 rounded-2xl">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
                        <TrendingUp className="w-4 h-4" />
                        Volume Diário (3d)
                      </div>
                      {avgVolume !== null ? (
                        <div>
                          <div className="text-2xl font-bold text-white mb-1">
                            {avgVolume.toLocaleString()}
                          </div>
                          <div className="text-zinc-500 text-xs">
                            Vendas/dia (Média 3 dias)
                          </div>
                        </div>
                      ) : (
                        <div className="text-zinc-500 italic">Sem dados de volume</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-b border-white/5 pb-4">
                    <div>
                      <span className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-1 block">Resultados para</span>
                      <div className="flex items-center gap-4">
                        <img 
                          src={getItemIcon(searchedItem)} 
                          alt={getItemName(searchedItem)} 
                          className="w-16 h-16 object-contain bg-zinc-900 rounded-lg border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                        <h2 className="text-3xl font-bold text-white tracking-tight">{getItemName(searchedItem)}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => { setSearchedItem(''); setPrices([]); setItemId(''); setError(null); }}
                        className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  {/* Price Grid */}
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-900/50 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                            <th className="px-6 py-4 border-b border-white/5">Cidade</th>
                            <th className="px-6 py-4 border-b border-white/5 group relative cursor-help">
                              Venda (Sell Price)
                              <div className="absolute hidden group-hover:block bg-zinc-800 text-white p-2 rounded text-[9px] normal-case tracking-normal w-40 z-20 top-full left-0 mt-1 shadow-xl border border-white/10">
                                Preço mínimo que os jogadores estão pedindo para vender o item.
                              </div>
                            </th>
                            <th className="px-6 py-4 border-b border-white/5 group relative cursor-help">
                              Compra (Buy Price)
                              <div className="absolute hidden group-hover:block bg-zinc-800 text-white p-2 rounded text-[9px] normal-case tracking-normal w-40 z-20 top-full left-0 mt-1 shadow-xl border border-white/10">
                                Preço máximo que os jogadores estão oferecendo para comprar o item.
                              </div>
                            </th>
                            <th className="px-6 py-4 border-b border-white/5">Última Atualização</th>
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
                                    {data ? formatDate(data.sell_price_min_date) : 'Sem dados'}
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
          ) : (
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Oportunidades de Mercado</h2>
                    <p className="text-xs text-zinc-500 mt-1">Configure os filtros abaixo e escaneie os 250 itens mais populares.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {opportunities.length > 0 && (
                      <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {opportunities.length} Encontradas
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Comprar em:</label>
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
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Vender em:</label>
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
                      </div>

                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Lucro Mínimo por Item:</label>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {minProfit.toLocaleString()} Prata
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200000"
                          step="1000"
                          value={minProfit}
                          onChange={(e) => setMinProfit(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                          <span>0</span>
                          <span>100k</span>
                          <span>200k</span>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              {opportunities.length === 0 && !scanning && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                    <Zap className="w-10 h-10 text-zinc-700" />
                  </div>
                  <h2 className="text-2xl font-light text-zinc-400 mb-2">Nenhuma oportunidade carregada</h2>
                  <p className="text-zinc-600 max-w-md mb-8">
                    Clique no botão "Escanear Mercado" acima para buscar as melhores diferenças de preço entre cidades.
                  </p>
                </div>
              )}

              {scanning && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                  <h3 className="text-xl font-semibold text-white">Escaneando Mercado...</h3>
                  <p className="text-zinc-500 text-sm mt-2">Isso pode levar alguns segundos enquanto processamos os dados da API.</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunities
                  .filter(opp => opp.profit >= minProfit)
                  .map((opp, idx) => (
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
                            src={getItemIcon(opp.item_id)} 
                            alt={opp.item_name}
                            className="w-12 h-12 object-contain bg-zinc-900 rounded-lg border border-white/5"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">{opp.item_name}</h3>
                            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{opp.item_id}</span>
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const conf = getConfidence(opp.buy_updated, opp.sell_updated);
                          return (
                            <div 
                              className={`text-[10px] font-bold px-2 py-1 rounded border ${conf.bg} ${conf.text} ${conf.border}`}
                              title={`Dados de até ${Math.round((new Date().getTime() - Math.min(new Date(opp.buy_updated).getTime(), new Date(opp.sell_updated).getTime())) / (1000 * 60 * 60))}h atrás`}
                            >
                              {conf.label}
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
                          Compre em <span className="text-zinc-200 font-semibold">{opp.buy_city}</span>
                        </div>
                        <span className="font-mono text-emerald-400">{formatPrice(opp.buy_price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <DollarSign className="w-3 h-3" />
                          Venda em <span className="text-zinc-200 font-semibold">{opp.sell_city}</span>
                        </div>
                        <span className="font-mono text-blue-400">{formatPrice(opp.sell_price)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Volume (3d)</span>
                        <span className="font-mono text-zinc-400 text-xs">{opp.avg_volume?.toLocaleString() || '---'} / dia</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Lucro Estimado</span>
                        <span className="font-mono text-amber-400 font-bold">{formatPrice(opp.profit)}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => { setItemId(opp.item_id); fetchPrices(opp.item_id); setActiveTab('search'); }}
                      className="w-full mt-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-white/5"
                    >
                      Ver Detalhes Completos
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-zinc-600 text-xs uppercase tracking-widest mb-2">Powered by Albion Online Data Project</p>
          <p className="text-zinc-700 text-[10px] max-w-lg mx-auto leading-relaxed">
            Os dados são fornecidos pela comunidade e podem não refletir os preços exatos no jogo em tempo real. 
            Use com cautela para decisões de mercado de alto risco.
          </p>
        </div>
      </footer>
    </div>
  );
}
