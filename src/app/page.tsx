"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, TrendingUp, TrendingDown, Target, Eye, Trash2, X,
  Settings, ArrowLeft, Copy, Check, RefreshCw, DollarSign, BarChart3,
  AlertTriangle, Award, Clock, Minus, Edit3, ChevronDown, Users, Sparkles,
} from "lucide-react";

// Types
interface Portfolio {
  id: string;
  name: string;
  code?: string;
  currency: string;
}

interface Position {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string | null;
  shares: number;
  buy_price: number;
  buy_date: string | null;
  sell_target: number | null;
  stop_loss: number | null;
  notes: string | null;
  status: string;
  sold_price: number | null;
  sold_date: string | null;
}

interface WatchlistItem {
  id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string | null;
  target_buy: number | null;
  notes: string | null;
}

interface PriceQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
  marketState: string;
}

type Tab = "positions" | "watchlist" | "closed";

export default function Home() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);

  // UI state
  const [tab, setTab] = useState<Tab>("positions");
  const [showSetup, setShowSetup] = useState(false);
  const [setupMode, setSetupMode] = useState<"choose" | "create" | "join">("choose");
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSellModal, setShowSellModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [portfolioName, setPortfolioName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Position form
  const [formTicker, setFormTicker] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formShares, setFormShares] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState("");
  const [formBuyDate, setFormBuyDate] = useState(new Date().toISOString().split("T")[0]);
  const [formSellTarget, setFormSellTarget] = useState("");
  const [formStopLoss, setFormStopLoss] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Watch form
  const [watchTicker, setWatchTicker] = useState("");
  const [watchCompany, setWatchCompany] = useState("");
  const [watchTarget, setWatchTarget] = useState("");
  const [watchNotes, setWatchNotes] = useState("");

  // Sell form
  const [sellPrice, setSellPrice] = useState("");
  const [sellDate, setSellDate] = useState(new Date().toISOString().split("T")[0]);

  // Edit form
  const [editSellTarget, setEditSellTarget] = useState("");
  const [editStopLoss, setEditStopLoss] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Init
  useEffect(() => {
    async function init() {
      try {
        await fetch("/api/init", { method: "POST" });
        setDbReady(true);
      } catch { console.error("DB init failed"); }

      const stored = localStorage.getItem("pt_portfolio");
      if (stored) {
        const p = JSON.parse(stored);
        try {
          const res = await fetch(`/api/portfolios?id=${p.id}`);
          if (res.ok) {
            const fresh = await res.json();
            setPortfolio(fresh);
            localStorage.setItem("pt_portfolio", JSON.stringify(fresh));
          } else setPortfolio(p);
        } catch { setPortfolio(p); }
      } else {
        setShowSetup(true);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!portfolio || !dbReady) return;
    try {
      const [posRes, closedRes, watchRes] = await Promise.all([
        fetch(`/api/positions?portfolioId=${portfolio.id}&status=open`),
        fetch(`/api/positions?portfolioId=${portfolio.id}&status=closed`),
        fetch(`/api/watchlist?portfolioId=${portfolio.id}`),
      ]);
      const pos = await posRes.json();
      const closed = await closedRes.json();
      const watch = await watchRes.json();
      setPositions(Array.isArray(pos) ? pos : []);
      setClosedPositions(Array.isArray(closed) ? closed : []);
      setWatchlist(Array.isArray(watch) ? watch : []);
    } catch { console.error("Failed to load data"); }
  }, [portfolio, dbReady]);

  useEffect(() => { loadData(); }, [loadData]);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    const allTickers = [
      ...positions.map(p => p.ticker),
      ...watchlist.map(w => w.ticker),
    ];
    const unique = [...new Set(allTickers)];
    if (unique.length === 0) return;

    setPricesLoading(true);
    try {
      const res = await fetch(`/api/prices?tickers=${unique.join(',')}`);
      const data = await res.json();
      const map: Record<string, PriceQuote> = {};
      for (const q of data.quotes || []) {
        map[q.symbol] = q;
      }
      setPrices(map);
    } catch { console.error("Price fetch failed"); }
    setPricesLoading(false);
  }, [positions, watchlist]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Handlers
  const handleCreatePortfolio = async () => {
    if (!portfolioName.trim()) return;
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: portfolioName.trim() }),
      });
      const p = await res.json();
      setPortfolio(p);
      localStorage.setItem("pt_portfolio", JSON.stringify(p));
      setShowSetup(false);
      setPortfolioName("");
    } catch { console.error("Failed to create portfolio"); }
  };

  const handleJoinPortfolio = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError("");
    try {
      const res = await fetch("/api/portfolios/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setJoinError(data.error || "Not found"); setJoinLoading(false); return; }
      setPortfolio(data);
      localStorage.setItem("pt_portfolio", JSON.stringify(data));
      setShowSetup(false);
      setJoinCode("");
      setSetupMode("choose");
    } catch { setJoinError("Something went wrong"); }
    setJoinLoading(false);
  };

  const handleAddPosition = async () => {
    if (!formTicker.trim() || !formShares || !formBuyPrice || !portfolio) return;
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          ticker: formTicker.trim(),
          companyName: formCompany.trim() || null,
          shares: parseFloat(formShares),
          buyPrice: parseFloat(formBuyPrice),
          buyDate: formBuyDate || null,
          sellTarget: formSellTarget ? parseFloat(formSellTarget) : null,
          stopLoss: formStopLoss ? parseFloat(formStopLoss) : null,
          notes: formNotes.trim() || null,
        }),
      });
      const pos = await res.json();
      setPositions(prev => [pos, ...prev]);
      resetPositionForm();
      setShowAddPosition(false);
    } catch { console.error("Failed"); }
  };

  const handleSellPosition = async () => {
    if (!showSellModal || !sellPrice) return;
    try {
      const res = await fetch("/api/positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showSellModal,
          status: "closed",
          soldPrice: parseFloat(sellPrice),
          soldDate: sellDate,
        }),
      });
      const updated = await res.json();
      setPositions(prev => prev.filter(p => p.id !== showSellModal));
      setClosedPositions(prev => [updated, ...prev]);
      setShowSellModal(null);
      setSellPrice("");
    } catch { console.error("Failed"); }
  };

  const handleEditPosition = async () => {
    if (!showEditModal) return;
    try {
      await fetch("/api/positions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showEditModal,
          sellTarget: editSellTarget ? parseFloat(editSellTarget) : null,
          stopLoss: editStopLoss ? parseFloat(editStopLoss) : null,
          notes: editNotes.trim() || null,
        }),
      });
      await loadData();
      setShowEditModal(null);
    } catch { console.error("Failed"); }
  };

  const handleDeletePosition = async (id: string) => {
    if (!confirm("Delete this position?")) return;
    try {
      await fetch("/api/positions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setPositions(prev => prev.filter(p => p.id !== id));
      setClosedPositions(prev => prev.filter(p => p.id !== id));
    } catch { console.error("Failed"); }
  };

  const handleAddWatch = async () => {
    if (!watchTicker.trim() || !portfolio) return;
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          ticker: watchTicker.trim(),
          companyName: watchCompany.trim() || null,
          targetBuy: watchTarget ? parseFloat(watchTarget) : null,
          notes: watchNotes.trim() || null,
        }),
      });
      const item = await res.json();
      setWatchlist(prev => [item, ...prev]);
      setWatchTicker("");
      setWatchCompany("");
      setWatchTarget("");
      setWatchNotes("");
      setShowAddWatch(false);
    } catch { console.error("Failed"); }
  };

  const handleDeleteWatch = async (id: string) => {
    if (!confirm("Remove from watchlist?")) return;
    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setWatchlist(prev => prev.filter(w => w.id !== id));
    } catch { console.error("Failed"); }
  };

  const handleCopyCode = async () => {
    if (!portfolio?.code) return;
    try {
      await navigator.clipboard.writeText(portfolio.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = portfolio.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const resetPositionForm = () => {
    setFormTicker("");
    setFormCompany("");
    setFormShares("");
    setFormBuyPrice("");
    setFormBuyDate(new Date().toISOString().split("T")[0]);
    setFormSellTarget("");
    setFormStopLoss("");
    setFormNotes("");
  };

  // Calculations
  const getPositionPnL = (pos: Position) => {
    const quote = prices[pos.ticker];
    if (!quote?.price) return null;
    const currentValue = quote.price * pos.shares;
    const costBasis = pos.buy_price * pos.shares;
    const pnl = currentValue - costBasis;
    const pnlPercent = ((quote.price - pos.buy_price) / pos.buy_price) * 100;
    return { currentValue, costBasis, pnl, pnlPercent, price: quote.price };
  };

  const getClosedPnL = (pos: Position) => {
    if (!pos.sold_price) return null;
    const proceeds = pos.sold_price * pos.shares;
    const costBasis = pos.buy_price * pos.shares;
    const pnl = proceeds - costBasis;
    const pnlPercent = ((pos.sold_price - pos.buy_price) / pos.buy_price) * 100;
    return { proceeds, costBasis, pnl, pnlPercent };
  };

  const totalInvested = positions.reduce((sum, p) => sum + (p.buy_price * p.shares), 0);
  const totalCurrentValue = positions.reduce((sum, p) => {
    const calc = getPositionPnL(p);
    return sum + (calc?.currentValue || p.buy_price * p.shares);
  }, 0);
  const totalPnL = totalCurrentValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const totalRealizedPnL = closedPositions.reduce((sum, p) => {
    const calc = getClosedPnL(p);
    return sum + (calc?.pnl || 0);
  }, 0);

  // Filter
  const filteredPositions = positions.filter(p =>
    !searchQuery || p.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.company_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWatchlist = watchlist.filter(w =>
    !searchQuery || w.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.company_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: portfolio?.currency || "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </motion.div>
      </div>
    );
  }

  // Setup screen
  if (showSetup || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📈</div>
            <h1 className="text-3xl font-bold mb-2">PortfolioTracker</h1>
            <p className="text-gray-400">Track your stocks, see your P&L, hit your targets.</p>
          </div>

          <AnimatePresence mode="wait">
            {setupMode === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <button onClick={() => setSetupMode("create")} className="w-full bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-emerald-500/50 transition-colors text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600/30 transition-colors">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Create Portfolio</h3>
                      <p className="text-sm text-gray-400">Start fresh — get a code to share</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setSetupMode("join")} className="w-full bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-blue-500/50 transition-colors text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-colors">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Join Portfolio</h3>
                      <p className="text-sm text-gray-400">Enter a code to access shared portfolio</p>
                    </div>
                  </div>
                </button>
                <p className="text-xs text-gray-500 text-center pt-2">No account needed — your data saves instantly.</p>
              </motion.div>
            )}

            {setupMode === "create" && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <button onClick={() => setSetupMode("choose")} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <label className="block text-sm font-medium text-gray-300 mb-2">Portfolio name</label>
                <input type="text" value={portfolioName} onChange={e => setPortfolioName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreatePortfolio()} placeholder="e.g. My Stocks" className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white placeholder-gray-500" />
                <button onClick={handleCreatePortfolio} disabled={!portfolioName.trim()} className="w-full mt-4 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Create Portfolio
                </button>
              </motion.div>
            )}

            {setupMode === "join" && (
              <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <button onClick={() => { setSetupMode("choose"); setJoinError(""); }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <label className="block text-sm font-medium text-gray-300 mb-2">Portfolio code</label>
                <input type="text" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }} onKeyDown={e => e.key === "Enter" && handleJoinPortfolio()} placeholder="e.g. PORT-7X3K" maxLength={9} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-white placeholder-gray-500 uppercase tracking-widest text-center text-lg font-mono" />
                {joinError && <p className="text-sm text-red-400 mt-2">{joinError}</p>}
                <button onClick={handleJoinPortfolio} disabled={!joinCode.trim() || joinLoading} className="w-full mt-4 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  {joinLoading ? "Looking up..." : "Join Portfolio"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="pt-6 pb-4 sticky top-0 bg-gray-950/80 backdrop-blur-xl z-30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <h1 className="text-xl font-bold">PortfolioTracker</h1>
              <p className="text-xs text-gray-500">{portfolio.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchPrices} disabled={pricesLoading} className={`p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-400 hover:text-white ${pricesLoading ? "animate-spin" : ""}`} title="Refresh prices">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors text-gray-400 hover:text-white" title="Settings">
                <Settings className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }} className="absolute right-0 top-full mt-2 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-50 p-4 min-w-[240px]">
                    <p className="text-xs text-gray-400 mb-1">Portfolio Code</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-lg font-bold text-emerald-400 tracking-widest">{portfolio.code || "—"}</span>
                      {portfolio.code && (
                        <button onClick={handleCopyCode} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                          {codeCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Share this code to let others view your portfolio.</p>
                    <div className="border-t border-gray-700 mt-3 pt-3">
                      <button onClick={() => {
                        if (confirm("Switch portfolio?")) {
                          localStorage.removeItem("pt_portfolio");
                          setPortfolio(null);
                          setPositions([]);
                          setWatchlist([]);
                          setShowSetup(true);
                          setSetupMode("choose");
                          setShowSettings(false);
                        }
                      }} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                        Switch portfolio
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><DollarSign className="w-3 h-3" /> Invested</div>
            <div className="text-lg font-bold">{fmt(totalInvested)}</div>
          </div>
          <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><BarChart3 className="w-3 h-3" /> Value</div>
            <div className="text-lg font-bold">{fmt(totalCurrentValue)}</div>
          </div>
          <div className={`bg-gray-900/50 rounded-xl p-3 border ${totalPnL >= 0 ? "border-emerald-900/50" : "border-red-900/50"}`}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              {totalPnL >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />} Unrealized
            </div>
            <div className={`text-lg font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(totalPnL)}
            </div>
            <div className={`text-xs ${totalPnL >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>{fmtPct(totalPnLPercent)}</div>
          </div>
          <div className={`bg-gray-900/50 rounded-xl p-3 border ${totalRealizedPnL >= 0 ? "border-emerald-900/50" : "border-red-900/50"}`}>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Award className="w-3 h-3" /> Realized</div>
            <div className={`text-lg font-bold ${totalRealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(totalRealizedPnL)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/50 rounded-xl p-1">
          {([
            { key: "positions" as Tab, label: "Positions", count: positions.length },
            { key: "watchlist" as Tab, label: "Watchlist", count: watchlist.length },
            { key: "closed" as Tab, label: "Closed", count: closedPositions.length },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-300"}`}>
              {t.label} <span className="text-xs opacity-60 ml-1">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search positions..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
        </div>
      </header>

      {/* Positions Tab */}
      {tab === "positions" && (
        <div className="space-y-3 mt-2">
          {filteredPositions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-xl font-semibold mb-2">No positions yet</h2>
              <p className="text-gray-400 mb-6">Add your first stock position to start tracking.</p>
              <button onClick={() => setShowAddPosition(true)} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Position
              </button>
            </div>
          ) : (
            filteredPositions.map(pos => {
              const calc = getPositionPnL(pos);
              const atTarget = calc && pos.sell_target && calc.price >= pos.sell_target;
              const atStopLoss = calc && pos.stop_loss && calc.price <= pos.stop_loss;

              return (
                <motion.div key={pos.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-gray-900 rounded-xl p-4 border transition-colors group ${
                    atTarget ? "border-emerald-500/50 bg-emerald-950/20" :
                    atStopLoss ? "border-red-500/50 bg-red-950/20" :
                    "border-gray-800/50 hover:border-gray-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg font-mono">{pos.ticker}</span>
                        {pos.company_name && <span className="text-xs text-gray-500">{pos.company_name}</span>}
                        {atTarget && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-600/20 text-emerald-400 font-medium flex items-center gap-1">
                            <Target className="w-3 h-3" /> TARGET HIT
                          </span>
                        )}
                        {atStopLoss && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-600/20 text-red-400 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> STOP LOSS
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm mt-2">
                        <div>
                          <span className="text-gray-500 text-xs">Shares</span>
                          <div className="font-medium">{pos.shares}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Avg Cost</span>
                          <div className="font-medium">{fmt(pos.buy_price)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Current</span>
                          <div className="font-medium">{calc ? fmt(calc.price) : "—"}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">P&L</span>
                          <div className={`font-medium ${calc ? (calc.pnl >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>
                            {calc ? `${fmt(calc.pnl)} (${fmtPct(calc.pnlPercent)})` : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {pos.sell_target && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Target: {fmt(pos.sell_target)}</span>}
                        {pos.stop_loss && <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Stop: {fmt(pos.stop_loss)}</span>}
                        {pos.buy_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(pos.buy_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                      </div>

                      {pos.notes && <p className="text-xs text-gray-500 mt-1 italic">📝 {pos.notes}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setShowEditModal(pos.id); setEditSellTarget(pos.sell_target?.toString() || ""); setEditStopLoss(pos.stop_loss?.toString() || ""); setEditNotes(pos.notes || ""); }} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-blue-400 transition-colors" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowSellModal(pos.id); setSellPrice(""); setSellDate(new Date().toISOString().split("T")[0]); }} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-emerald-400 transition-colors" title="Sell">
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePosition(pos.id)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Watchlist Tab */}
      {tab === "watchlist" && (
        <div className="space-y-3 mt-2">
          {filteredWatchlist.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">👁️</div>
              <h2 className="text-xl font-semibold mb-2">Watchlist empty</h2>
              <p className="text-gray-400 mb-6">Add stocks you&apos;re watching.</p>
              <button onClick={() => setShowAddWatch(true)} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add to Watchlist
              </button>
            </div>
          ) : (
            filteredWatchlist.map(item => {
              const quote = prices[item.ticker];
              const atTarget = quote && item.target_buy && quote.price <= item.target_buy;

              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-gray-900 rounded-xl p-4 border transition-colors group ${
                    atTarget ? "border-blue-500/50 bg-blue-950/20" : "border-gray-800/50 hover:border-gray-700/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg font-mono">{item.ticker}</span>
                        {item.company_name && <span className="text-xs text-gray-500">{item.company_name}</span>}
                        {atTarget && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600/20 text-blue-400 font-medium flex items-center gap-1">
                            <Target className="w-3 h-3" /> BUY ZONE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <div>
                          <span className="text-gray-500 text-xs">Price</span>
                          <div className="font-medium">{quote ? fmt(quote.price) : "—"}</div>
                        </div>
                        {quote && (
                          <div>
                            <span className="text-gray-500 text-xs">Change</span>
                            <div className={`font-medium ${quote.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {fmtPct(quote.changePercent)}
                            </div>
                          </div>
                        )}
                        {item.target_buy && (
                          <div>
                            <span className="text-gray-500 text-xs">Buy Target</span>
                            <div className="font-medium text-blue-400">{fmt(item.target_buy)}</div>
                          </div>
                        )}
                      </div>
                      {item.notes && <p className="text-xs text-gray-500 mt-1 italic">📝 {item.notes}</p>}
                    </div>
                    <button onClick={() => handleDeleteWatch(item.id)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Closed Tab */}
      {tab === "closed" && (
        <div className="space-y-3 mt-2">
          {closedPositions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📦</div>
              <h2 className="text-xl font-semibold mb-2">No closed positions</h2>
              <p className="text-gray-400">Sell a position to see it here.</p>
            </div>
          ) : (
            closedPositions.map(pos => {
              const calc = getClosedPnL(pos);
              return (
                <motion.div key={pos.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900 rounded-xl p-4 border border-gray-800/50 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg font-mono">{pos.ticker}</span>
                        {pos.company_name && <span className="text-xs text-gray-500">{pos.company_name}</span>}
                        {calc && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${calc.pnl >= 0 ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"}`}>
                            {calc.pnl >= 0 ? "WIN" : "LOSS"} {fmtPct(calc.pnlPercent)}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm mt-2">
                        <div><span className="text-gray-500 text-xs">Shares</span><div className="font-medium">{pos.shares}</div></div>
                        <div><span className="text-gray-500 text-xs">Buy</span><div className="font-medium">{fmt(pos.buy_price)}</div></div>
                        <div><span className="text-gray-500 text-xs">Sell</span><div className="font-medium">{fmt(pos.sold_price || 0)}</div></div>
                        <div>
                          <span className="text-gray-500 text-xs">P&L</span>
                          <div className={`font-medium ${calc ? (calc.pnl >= 0 ? "text-emerald-400" : "text-red-400") : ""}`}>
                            {calc ? fmt(calc.pnl) : "—"}
                          </div>
                        </div>
                      </div>
                      {pos.sold_date && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Sold {new Date(pos.sold_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
                    </div>
                    <button onClick={() => handleDeletePosition(pos.id)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => tab === "watchlist" ? setShowAddWatch(true) : setShowAddPosition(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 flex items-center justify-center z-40 transition-colors">
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Add Position Modal */}
      <AnimatePresence>
        {showAddPosition && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAddPosition(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Add Position</h2>
                <button onClick={() => setShowAddPosition(false)} className="p-1 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ticker *</label>
                    <input type="text" value={formTicker} onChange={e => setFormTicker(e.target.value.toUpperCase())} placeholder="AAPL" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Company</label>
                    <input type="text" value={formCompany} onChange={e => setFormCompany(e.target.value)} placeholder="Apple Inc" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Shares *</label>
                    <input type="number" value={formShares} onChange={e => setFormShares(e.target.value)} placeholder="100" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Buy Price *</label>
                    <input type="number" value={formBuyPrice} onChange={e => setFormBuyPrice(e.target.value)} placeholder="150.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Buy Date</label>
                  <input type="date" value={formBuyDate} onChange={e => setFormBuyDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sell Target</label>
                    <input type="number" value={formSellTarget} onChange={e => setFormSellTarget(e.target.value)} placeholder="200.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Stop Loss</label>
                    <input type="number" value={formStopLoss} onChange={e => setFormStopLoss(e.target.value)} placeholder="130.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Bought near 52-week low..." className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <button onClick={handleAddPosition} disabled={!formTicker.trim() || !formShares || !formBuyPrice} className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Add Position 📈
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Watchlist Modal */}
      <AnimatePresence>
        {showAddWatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowAddWatch(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Eye className="w-5 h-5 text-blue-400" /> Add to Watchlist</h2>
                <button onClick={() => setShowAddWatch(false)} className="p-1 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ticker *</label>
                    <input type="text" value={watchTicker} onChange={e => setWatchTicker(e.target.value.toUpperCase())} placeholder="MSFT" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Company</label>
                    <input type="text" value={watchCompany} onChange={e => setWatchCompany(e.target.value)} placeholder="Microsoft" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Buy Target</label>
                  <input type="number" value={watchTarget} onChange={e => setWatchTarget(e.target.value)} placeholder="350.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <input type="text" value={watchNotes} onChange={e => setWatchNotes(e.target.value)} placeholder="Wait for earnings dip..." className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <button onClick={handleAddWatch} disabled={!watchTicker.trim()} className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
                  Add to Watchlist 👁️
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sell Modal */}
      <AnimatePresence>
        {showSellModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowSellModal(null)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-400" /> Close Position</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sell Price *</label>
                  <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="200.00" step="any" autoFocus className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sell Date</label>
                  <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowSellModal(null)} className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors">Cancel</button>
                  <button onClick={handleSellPosition} disabled={!sellPrice} className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium transition-colors">Sell 💰</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowEditModal(null)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-400" /> Edit Position</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sell Target</label>
                  <input type="number" value={editSellTarget} onChange={e => setEditSellTarget(e.target.value)} placeholder="200.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Stop Loss</label>
                  <input type="number" value={editStopLoss} onChange={e => setEditStopLoss(e.target.value)} placeholder="130.00" step="any" className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notes</label>
                  <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..." className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowEditModal(null)} className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 font-medium transition-colors">Cancel</button>
                  <button onClick={handleEditPosition} className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium transition-colors">Save ✓</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
