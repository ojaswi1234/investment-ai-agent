'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Hexagon, Settings, Key, Cpu, Sparkles,
  TrendingUp, TrendingDown, ArrowRight, Activity,
  Globe, ShieldAlert, BarChart3, Users, MessageCircle, AlertTriangle, Info, CheckCircle2, XCircle, Check, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import TimelineLoader from '@/components/TimelineLoader';
import CircularProgress from '@/components/CircularProgress';
import RadialGauge from '@/components/RadialGauge';

interface ResearchResult {
  company: string;
  recommendation: 'INVEST' | 'PASS';
  confidence: number;
  reasoning: {
    business_overview: string;
    strengths: string[];
    weaknesses: string[];
    financial_analysis: string;
    market_position: string;
    growth_potential: string;
    key_risks: string[];
  };
  investment_thesis: string;
  suggested_time_horizon: string;
  peer_comparison?: {
    competitors: string[];
    comparison_metrics: any;
    competitive_position: string;
  };
  historical_context?: {
    revenue_trend: { three_year_avg: number; current: number; trend: string };
    profit_trend: { three_year_avg: number; current: number; trend: string };
    key_changes: string[];
    pattern_analysis: string;
  };
  sources?: Array<{ type: string; year?: string; source?: string; reliability: string }>;
  materiality_assessment?: {
    high_impact_factors: string[];
    medium_impact_factors: string[];
    low_impact_factors: string[];
  };
  sector_context?: {
    sector_name: string;
    sector_outlook: string;
    sector_trends: string[];
    company_vs_sector: string;
  };
  sentiment_analysis?: {
    overall_sentiment: string;
    sentiment_trend: string;
    key_sentiment_drivers: string[];
    news_sentiment_summary: string;
  };
  risk_matrix?: {
    high_likelihood_high_impact: string[];
    high_likelihood_low_impact: string[];
    low_likelihood_high_impact: string[];
    low_likelihood_low_impact: string[];
    mitigation_strategies: string[];
  };
  financial_health_score?: {
    overall_score: number;
    score_category: string;
    component_scores: { profitability: number; solvency: number; efficiency: number; growth: number; };
    trend: string;
  };
}

const SearchForm = ({ loading, onAnalyze, defaultQuery }: { loading: boolean, onAnalyze: (q: string) => void, defaultQuery: string }) => {
  const [query, setQuery] = useState(defaultQuery);
  useEffect(() => setQuery(defaultQuery), [defaultQuery]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onAnalyze(query); }} className="w-full md:w-[400px] relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Company name (e.g. Apple, Tesla)"
        className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl pl-11 pr-32 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all placeholder:text-slate-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg text-sm font-medium hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
      >
        Analyze
      </button>
    </form>
  );
};

const CompareForm = ({ loading, onCompare }: { loading: boolean, onCompare: (companies: string[]) => void }) => {
  const [input, setInput] = useState('');
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="E.g. Apple, Microsoft, Google"
          className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <p className="text-xs text-slate-500 mt-2 ml-1">Comma separated list of companies</p>
      </div>
      <button
        onClick={() => {
          const comps = input.split(',').map(c => c.trim()).filter(c => c);
          onCompare(comps);
        }}
        disabled={loading || input.split(',').map(c=>c.trim()).filter(c=>c).length < 2}
        className="px-8 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 h-[46px] shrink-0"
      >
        {loading ? 'Analyzing...' : 'Compare'}
      </button>
    </div>
  );
};

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'research' | 'compare' | 'watchlist' | 'history' | 'rag' | 'settings'>('research');
  
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');

  useEffect(() => {
    const storedKey = localStorage.getItem('groq_api_key');
    const storedModel = localStorage.getItem('groq_model');
    if (storedKey) setApiKey(storedKey);
    if (storedModel) setSelectedModel(storedModel);
  }, []);

  const [compareCompanies, setCompareCompanies] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<any>(null);

  const detectAnomalies = (metrics: any[]) => {
    if (!metrics || metrics.length < 3) return null;
    const anomalies: any[] = [];
    const checkMetric = (key: string, name: string) => {
      const values = metrics.map(m => m[key]).filter(v => typeof v === 'number');
      if (values.length < 3) return;
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev === 0) return;
      metrics.forEach(m => {
        if (typeof m[key] === 'number') {
          const zScore = Math.abs(m[key] - mean) / stdDev;
          if (zScore > 1.15) {
            anomalies.push({
              company: m.company,
              metric: name,
              value: m[key],
              mean: mean.toFixed(2),
              zScore: zScore.toFixed(2)
            });
          }
        }
      });
    };
    checkMetric('pe_ratio', 'P/E Ratio');
    checkMetric('debt_to_equity', 'Debt-to-Equity');
    checkMetric('profit_margin', 'Profit Margin (%)');
    return anomalies.length > 0 ? anomalies : null;
  };

  const anomalies = useMemo(() => {
    return compareResult?.quantitative_metrics ? detectAnomalies(compareResult.quantitative_metrics) : null;
  }, [compareResult]);

  const fetchAnalysis = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: query.trim(),
          apiKey: apiKey,
          model: selectedModel 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze company');
      }

      const data = await response.json();
      setResult(data);

      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: data.company, 
          recommendation: data.recommendation, 
          confidence: data.confidence 
        }),
      });
      loadHistory();
      toast.success(`Analysis complete for ${data.company}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false); // Stop loading if error, otherwise timeline finishes and stops it
    }
  };

  const analyzeCompany = (query: string) => {
    setCompanyName(query);
    fetchAnalysis(query);
  };

  const loadWatchlist = async () => {
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();
      setWatchlist(data.companies || []);
    } catch (err) {}
  };

  const addToWatchlist = async (company: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company }),
      });
      toast.success(`${company} added to Watchlist`);
      loadWatchlist();
    } catch (err) {
      toast.error('Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (company: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company }),
      });
      toast.success(`${company} removed from Watchlist`);
      loadWatchlist();
    } catch (err) {
      toast.error('Failed to remove from watchlist');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {}
  };

  const compareCompaniesHandler = async (companiesToCompare: string[]) => {
    if (companiesToCompare.length < 2) {
      toast.error("Please enter at least 2 companies to compare");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companies: companiesToCompare,
          apiKey: apiKey,
          model: selectedModel 
        }),
      });

      if (!response.ok) throw new Error('Comparison failed');
      const data = await response.json();
      setCompareResult(data);
      toast.success("Comparison complete");
    } catch (err) {
      toast.error('Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!result) return;
    const url = new URL(window.location.href);
    url.searchParams.set('q', result.company);
    navigator.clipboard.writeText(url.toString());
    toast.success('Link copied to clipboard!');
  };

  const exportToPDF = () => {
    window.print();
  };

  useEffect(() => {
    loadWatchlist();
    loadHistory();
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setCompanyName(q);
      fetchAnalysis(q);
    }
  }, []);

  const tabs = [
    { id: 'research', label: 'Research' },
    { id: 'compare', label: 'Compare' },
    { id: 'watchlist', label: 'Watchlist', count: watchlist.length },
    { id: 'rag', label: 'Doc RAG' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  const staggerVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="min-h-screen">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 rounded-none bg-[#0a0a0f]/70 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Hexagon size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              LuminaQuant
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`p-2 transition-colors ${activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 pb-20">
        
        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          
          <div className="bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/10 flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                  activeTab === tab.id ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-indigo-500/20 border border-indigo-500/30 rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px] leading-none">
                      {tab.count}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'research' && (
            <SearchForm loading={loading} onAnalyze={analyzeCompany} defaultQuery={companyName} />
          )}
        </div>

        {/* Content Area */}
        {activeTab === 'research' && (
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
                <TimelineLoader onComplete={() => setLoading(false)} />
              </motion.div>
            ) : result ? (
              <motion.div key="results" initial="hidden" animate="visible" className="space-y-6">
                
                {/* Hero Dashboard Card */}
                <motion.div custom={0} variants={staggerVariants} className="glass-panel p-6 sm:p-8 rounded-2xl">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div>
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-4 tracking-tight">
                        {result.company}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-[0_0_20px_rgba(0,0,0,0.2)] ${
                          result.recommendation === 'INVEST' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20' 
                            : 'bg-red-500/10 border-red-500/30 text-red-400 shadow-red-500/20'
                        }`}>
                          {result.recommendation}
                        </div>
                        <span className="glass-panel px-3 py-1.5 rounded-full text-xs text-slate-300">
                          {result.suggested_time_horizon}
                        </span>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <button onClick={() => addToWatchlist(result.company)} className="glass-panel px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
                          <Activity size={16} /> Add to Watchlist
                        </button>
                        <button onClick={copyShareLink} className="glass-panel border-transparent bg-transparent hover:bg-white/5 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 text-slate-300">
                          <Globe size={16} /> Share
                        </button>
                        <button onClick={exportToPDF} className="glass-panel border-transparent bg-transparent hover:bg-white/5 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 text-slate-300">
                          <ArrowRight size={16} /> Export
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center justify-center lg:justify-end">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-sm mb-3">AI Confidence</span>
                        <CircularProgress value={result.confidence} />
                      </div>
                      
                      {result.financial_health_score && (
                        <div className="flex flex-col items-center">
                          <span className="text-slate-400 text-sm mb-3">Financial Health</span>
                          <RadialGauge value={result.financial_health_score.overall_score} />
                          <span className="text-xs text-slate-500 mt-2 capitalize">{result.financial_health_score.score_category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Investment Thesis (Spans 2 cols) */}
                  <motion.div custom={1} variants={staggerVariants} className="md:col-span-2 glass-panel p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent">
                    <h3 className="flex items-center gap-2 text-indigo-300 font-semibold mb-4"><Sparkles size={18}/> Investment Thesis</h3>
                    <p className="text-lg text-slate-200 leading-relaxed font-medium">"{result.investment_thesis}"</p>
                  </motion.div>

                  {/* Business Overview */}
                  <motion.div custom={2} variants={staggerVariants} className="glass-panel p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-4"><Info size={18}/> Business Overview</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{result.reasoning.business_overview}</p>
                  </motion.div>

                  {/* Strengths & Weaknesses */}
                  <motion.div custom={3} variants={staggerVariants} className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
                    <div>
                      <h3 className="flex items-center gap-2 text-emerald-400 font-semibold mb-3"><TrendingUp size={18}/> Strengths</h3>
                      <ul className="space-y-2">
                        {result.reasoning.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500/50 shrink-0 mt-0.5"/> {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="w-full h-px bg-white/10" />
                    <div>
                      <h3 className="flex items-center gap-2 text-red-400 font-semibold mb-3"><TrendingDown size={18}/> Weaknesses</h3>
                      <ul className="space-y-2">
                        {result.reasoning.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><XCircle size={16} className="text-red-500/50 shrink-0 mt-0.5"/> {w}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>

                  {/* Financial Analysis */}
                  <motion.div custom={4} variants={staggerVariants} className="glass-panel p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-4"><BarChart3 size={18}/> Financial Analysis</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">{result.reasoning.financial_analysis}</p>
                    {result.financial_health_score && (
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        {Object.entries(result.financial_health_score.component_scores).map(([k, v]) => (
                          <div key={k} className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <div className="text-xs text-slate-500 capitalize">{k}</div>
                            <div className="font-financial text-indigo-300">{v}/100</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* Market Position */}
                  <motion.div custom={5} variants={staggerVariants} className="glass-panel p-6 rounded-2xl">
                    <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-4"><Globe size={18}/> Market Position</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{result.reasoning.market_position}</p>
                    
                    {result.sector_context && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Sector Context</div>
                        <div className="text-sm text-slate-300">{result.sector_context.sector_name} • <span className={`capitalize ${result.sector_context.sector_outlook === 'positive' ? 'text-emerald-400' : 'text-amber-400'}`}>{result.sector_context.sector_outlook} outlook</span></div>
                      </div>
                    )}
                  </motion.div>

                  {/* Risk Matrix (Spans 2 cols on md+) */}
                  {result.risk_matrix && (
                    <motion.div custom={6} variants={staggerVariants} className="md:col-span-2 glass-panel p-6 rounded-2xl">
                      <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-6"><ShieldAlert size={18}/> Risk Assessment Matrix</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                          <div className="text-xs font-bold text-red-400 uppercase tracking-wide mb-2">High Likelihood / High Impact</div>
                          <ul className="space-y-1">
                            {result.risk_matrix.high_likelihood_high_impact.map((r, i) => <li key={i} className="text-sm text-red-200/80 leading-snug">• {r}</li>)}
                          </ul>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">High Likelihood / Low Impact</div>
                          <ul className="space-y-1">
                            {result.risk_matrix.high_likelihood_low_impact.map((r, i) => <li key={i} className="text-sm text-amber-200/80 leading-snug">• {r}</li>)}
                          </ul>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl">
                          <div className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-2">Low Likelihood / High Impact</div>
                          <ul className="space-y-1">
                            {result.risk_matrix.low_likelihood_high_impact.map((r, i) => <li key={i} className="text-sm text-orange-200/80 leading-snug">• {r}</li>)}
                          </ul>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2">Low Likelihood / Low Impact</div>
                          <ul className="space-y-1">
                            {result.risk_matrix.low_likelihood_low_impact.map((r, i) => <li key={i} className="text-sm text-emerald-200/80 leading-snug">• {r}</li>)}
                          </ul>
                        </div>
                      </div>

                      {result.risk_matrix.mitigation_strategies && (
                        <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                          <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">Suggested Mitigation Strategies</div>
                          <ul className="space-y-1">
                            {result.risk_matrix.mitigation_strategies.map((r, i) => <li key={i} className="text-sm text-indigo-200/80 leading-snug">• {r}</li>)}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Peer Comparison (Spans all cols) */}
                  {result.peer_comparison && (
                    <motion.div custom={7} variants={staggerVariants} className="md:col-span-2 lg:col-span-3 glass-panel p-6 rounded-2xl">
                      <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-6"><Users size={18}/> Peer Comparison</h3>
                      <div className="text-sm text-slate-400 mb-4">Against: {result.peer_comparison.competitors.join(', ')}</div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-white/5 text-slate-300 font-semibold">
                            <tr>
                              <th className="p-4 border-b border-white/10 rounded-tl-xl">Metric</th>
                              <th className="p-4 border-b border-white/10">Company</th>
                              <th className="p-4 border-b border-white/10">Industry Avg</th>
                              <th className="p-4 border-b border-white/10 rounded-tr-xl">Interpretation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {Object.entries(result.peer_comparison.comparison_metrics).map(([metric, data]: [string, any]) => {
                              // Calculate simple progress bar logic based on if company > industry
                              const better = data.company > data.industry_avg;
                              return (
                                <tr key={metric} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="p-4 font-medium text-slate-200 capitalize">{metric.replace(/_/g, ' ')}</td>
                                  <td className="p-4 font-financial">
                                    <div className="flex items-center gap-2">
                                      {data.company}
                                      <div className={`h-1.5 w-16 rounded-full bg-white/10 overflow-hidden`}>
                                        <div className={`h-full ${better ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${Math.min((data.company/data.industry_avg)*50, 100)}%`}}/>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 font-financial text-slate-400">{data.industry_avg}</td>
                                  <td className="p-4 text-xs text-slate-500 max-w-[200px]">{data.interpretation}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Additional Context Blocks */}
                  {result.sentiment_analysis && (
                    <motion.div custom={8} variants={staggerVariants} className="glass-panel p-6 rounded-2xl">
                      <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-4"><MessageCircle size={18}/> Sentiment Analysis</h3>
                      <div className="flex items-center gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          result.sentiment_analysis.overall_sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                          result.sentiment_analysis.overall_sentiment === 'negative' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {result.sentiment_analysis.overall_sentiment.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">{result.sentiment_analysis.sentiment_trend} trend</span>
                      </div>
                      <p className="text-sm text-slate-400">{result.sentiment_analysis.news_sentiment_summary}</p>
                    </motion.div>
                  )}

                  {result.historical_context && (
                    <motion.div custom={9} variants={staggerVariants} className="glass-panel p-6 rounded-2xl md:col-span-2">
                      <h3 className="flex items-center gap-2 text-slate-300 font-semibold mb-4"><Activity size={18}/> Historical Context</h3>
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <div className="text-xs text-slate-500 mb-1">Revenue Trend</div>
                          <div className="text-lg font-financial text-slate-200">Cur: {result.historical_context.revenue_trend.current}% <span className="text-sm text-slate-500">| 3yr: {result.historical_context.revenue_trend.three_year_avg}%</span></div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                          <div className="text-xs text-slate-500 mb-1">Profit Trend</div>
                          <div className="text-lg font-financial text-slate-200">Cur: {result.historical_context.profit_trend.current}% <span className="text-sm text-slate-500">| 3yr: {result.historical_context.profit_trend.three_year_avg}%</span></div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400">{result.historical_context.pattern_analysis}</p>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Hexagon size={32} className="text-slate-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-300 mb-2">Ready to Analyze</h2>
                <p className="text-slate-500 max-w-md">Enter a company name above to generate a comprehensive, AI-powered investment research report.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Compare Tab */}
        {activeTab === 'compare' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-panel p-6 sm:p-8 rounded-2xl">
              <h3 className="text-xl font-bold text-slate-200 mb-6">Compare Companies</h3>
              <CompareForm loading={loading} onCompare={compareCompaniesHandler} />
            </div>

            {compareResult && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 mb-8">Comparison Results</h3>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {anomalies && (
                    <div className="md:col-span-2 glass-panel p-5 rounded-xl border border-red-500/30 bg-red-500/10 mb-4">
                      <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                        <AlertTriangle size={18} /> ML Anomaly Detected (Z-Score Clustering)
                      </h4>
                      <p className="text-sm text-slate-300 mb-3">Our statistical anomaly detection algorithm flagged the following irregular financial behaviors compared to the peer cluster:</p>
                      <ul className="space-y-2">
                        {anomalies.map((anomaly, index) => (
                          <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-red-500 mt-1">⚠️</span>
                            <span>
                              <strong>{anomaly.company}</strong> has an abnormal <strong>{anomaly.metric}</strong> of {anomaly.value}. 
                              (Cluster Mean: {anomaly.mean}, Z-Score: {anomaly.zScore}σ)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-4 flex items-center gap-2"><TrendingUp size={18}/> Overall Ranking</h4>
                    <div className="space-y-3">
                      {compareResult.comparison_analysis?.overall_ranking?.map((company: string, index: number) => (
                        <div key={index} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            index === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                            'bg-orange-700/20 text-orange-400 border border-orange-700/30'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-slate-200">{company}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-300 mb-4 flex items-center gap-2"><CheckCircle2 size={18}/> Recommendation</h4>
                    <p className="text-slate-400 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                      {compareResult.comparison_analysis?.investment_recommendation}
                    </p>
                  </div>

                  <div className="md:col-span-2 grid md:grid-cols-2 gap-6 mt-4">
                    <div className="glass-panel p-5 rounded-xl bg-indigo-500/5">
                      <h4 className="font-semibold text-indigo-300 mb-3">Key Differences</h4>
                      <ul className="space-y-2">
                        {compareResult.key_differences?.map((diff: string, index: number) => (
                          <li key={index} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-indigo-500 mt-1">•</span>{diff}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="glass-panel p-5 rounded-xl bg-emerald-500/5">
                      <h4 className="font-semibold text-emerald-300 mb-3">Similarities</h4>
                      <ul className="space-y-2">
                        {compareResult.similarities?.map((sim: string, index: number) => (
                          <li key={index} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-emerald-500 mt-1">•</span>{sim}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-2xl max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2"><Activity size={20}/> Your Watchlist</h3>
            {watchlist.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle size={32} className="mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Your watchlist is empty. Add companies from the Research tab.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {watchlist.map((company, index) => (
                  <li key={index} className="flex justify-between items-center p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                    <span className="font-medium text-slate-200">{company}</span>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toast('Alerts configured')}
                        className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 text-sm font-medium transition-colors"
                      >
                        Alerts
                      </button>
                      <button
                        onClick={() => removeFromWatchlist(company)}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* Doc RAG Tab */}
        {activeTab === 'rag' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-2xl max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2"><FileText size={20}/> Chat with SEC Filings</h3>
            <p className="text-sm text-slate-400 mb-6">Upload a 10-K or Annual Report PDF to extract context using local ML Embeddings and query it with LLM RAG.</p>
            
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              const form = e.target;
              const file = form.file.files[0];
              const query = form.query.value;
              if (!file || !query) { toast.error("Please provide a file and a query"); return; }
              setLoading(true);
              try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('query', query);
                formData.append('apiKey', apiKey);
                formData.append('model', selectedModel);
                
                const res = await fetch('/api/rag', { method: 'POST', body: formData });
                const data = await res.json();
                if(data.error) throw new Error(data.error);
                
                toast.success(`Answer generated using ${data.retrieved_chunks} document chunks`);
                // Render the answer
                const answerDiv = document.getElementById('rag-answer');
                if(answerDiv) answerDiv.innerHTML = data.answer.replace(/\n/g, '<br/>');
                
              } catch(e:any) {
                toast.error(e.message || "RAG failed");
              } finally {
                setLoading(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Upload PDF Document</label>
                <input type="file" name="file" accept="application/pdf" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Question</label>
                <textarea name="query" rows={3} placeholder="E.g., What are the key risk factors mentioned?" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"></textarea>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">
                {loading ? 'Analyzing Document (Running Embeddings)...' : 'Ask Document'}
              </button>
            </form>
            
            <div className="mt-8 border-t border-white/10 pt-6">
              <h4 className="font-semibold text-slate-300 mb-3">AI Answer:</h4>
              <div id="rag-answer" className="text-slate-400 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 min-h-[100px]">
                Your answer will appear here...
              </div>
            </div>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-2xl max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-slate-200 mb-8 flex items-center gap-2"><Globe size={20}/> Analysis History</h3>
            {history.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No analysis history</p>
            ) : (
              <div className="relative pl-4 border-l border-white/10 space-y-8">
                {history.map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-[#0a0a0f]" />
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => {
                      setCompanyName(item.companyName);
                      setActiveTab('research');
                      fetchAnalysis(item.companyName);
                    }}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-lg font-bold text-slate-200">{item.companyName}</span>
                        <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          item.recommendation === 'INVEST' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.recommendation}
                        </span>
                        <span className="text-slate-400 text-xs">Confidence: {item.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-200 mb-2 flex items-center gap-2"><Settings size={20}/> Model Settings (Bring-Your-Own-Key)</h3>
              <p className="text-sm text-slate-400">Configure your Groq API key and select your preferred model. Your key is stored locally in your browser and never saved to our servers.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Key size={16}/> Groq API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('groq_api_key', e.target.value);
                  }}
                  placeholder="gsk_..."
                  className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Cpu size={16}/> Select Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    localStorage.setItem('groq_model', e.target.value);
                  }}
                  className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-white appearance-none"
                >
                  <option value="llama-3.3-70b-versatile" className="bg-slate-900">Llama 3.3 70B Versatile (Recommended)</option>
                  <option value="llama3-70b-8192" className="bg-slate-900">Llama 3 70B 8192</option>
                  <option value="mixtral-8x7b-32768" className="bg-slate-900">Mixtral 8x7B 32768</option>
                  <option value="gemma2-9b-it" className="bg-slate-900">Gemma 2 9B IT</option>
                </select>
              </div>
            </div>
            
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex gap-3">
              <Info className="text-indigo-400 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-indigo-200/80 leading-relaxed">
                We take security seriously. Your API key remains entirely on your device and is only transmitted directly to the backend temporarily during analysis via HTTPS. It is never logged or persisted on the server.
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
