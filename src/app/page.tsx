'use client';

import { useState, useEffect } from 'react';

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
    comparison_metrics: {
      'P/E_ratio': { company: number; industry_avg: number; interpretation: string };
      revenue_growth: { company: number; industry_avg: number; interpretation: string };
      profit_margin: { company: number; industry_avg: number; interpretation: string };
      debt_to_equity: { company: number; industry_avg: number; interpretation: string };
    };
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
    component_scores: {
      profitability: number;
      solvency: number;
      efficiency: number;
      growth: number;
    };
    trend: string;
  };
}

export default function Home() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [compareCompanies, setCompareCompanies] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'research' | 'compare' | 'watchlist' | 'history'>('research');

  const fetchAnalysis = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: query.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze company');
      }

      const data = await response.json();
      setResult(data);

      // Add to history
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const analyzeCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchAnalysis(companyName);
  };

  const loadWatchlist = async () => {
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();
      setWatchlist(data.companies || []);
    } catch (err) {
      // Silent fail
    }
  };

  const addToWatchlist = async (company: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company }),
      });
      alert(`Added ${company} to Watchlist! You will now receive alerts for major metric changes.`);
      loadWatchlist();
    } catch (err) {
      // Silent fail
    }
  };

  const removeFromWatchlist = async (company: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: company }),
      });
      loadWatchlist();
    } catch (err) {
      console.error('Failed to remove from watchlist');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history');
    }
  };

  const compareCompaniesHandler = async () => {
    if (compareCompanies.length < 2) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: compareCompanies }),
      });

      if (!response.ok) {
        throw new Error('Comparison failed');
      }

      const data = await response.json();
      setCompareResult(data);
    } catch (err) {
      setError('Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const copyShareLink = () => {
    if (!result) return;
    const url = new URL(window.location.href);
    url.searchParams.set('q', result.company);
    navigator.clipboard.writeText(url.toString());
    alert('Analysis link copied to clipboard!');
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Investment Research Agent
          </h1>
          <p className="text-gray-600">
            Comprehensive AI-powered investment analysis
          </p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('research')}
            className={`px-4 py-2 ${activeTab === 'research' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Research
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-2 ${activeTab === 'compare' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-2 ${activeTab === 'watchlist' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Watchlist ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'research' && (
          <>
            <form onSubmit={analyzeCompany} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name (e.g. Apple, Tesla, Reliance)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !companyName.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{result.company}</h2>
                      <p className="text-sm text-gray-500">{result.suggested_time_horizon}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToWatchlist(result.company)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        + Watchlist & Alert
                      </button>
                      <button
                        onClick={copyShareLink}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Share
                      </button>
                      <button
                        onClick={exportToPDF}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Export PDF
                      </button>
                      <div className={`px-3 py-1 rounded font-bold ${
                        result.recommendation === 'INVEST' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.recommendation}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Confidence</span>
                      <span className="font-bold">{result.confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          result.confidence >= 70 ? 'bg-green-500' : 
                          result.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>

                  {result.financial_health_score && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Financial Health Score</span>
                        <span className={`px-2 py-1 rounded text-sm font-bold ${
                          result.financial_health_score.score_category === 'excellent' ? 'bg-green-100 text-green-800' :
                          result.financial_health_score.score_category === 'good' ? 'bg-blue-100 text-blue-800' :
                          result.financial_health_score.score_category === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.financial_health_score.overall_score}/100 - {result.financial_health_score.score_category}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                        <div>Profitability: {result.financial_health_score.component_scores.profitability}</div>
                        <div>Solvency: {result.financial_health_score.component_scores.solvency}</div>
                        <div>Efficiency: {result.financial_health_score.component_scores.efficiency}</div>
                        <div>Growth: {result.financial_health_score.component_scores.growth}</div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Investment Thesis</h3>
                    <p className="text-gray-700">{result.investment_thesis}</p>
                  </div>
                </div>

                {result.peer_comparison && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Peer Comparison</h3>
                    <p className="text-sm text-gray-600 mb-2">Competitors: {result.peer_comparison.competitors.join(', ')}</p>
                    <div className="overflow-x-auto mt-4 mb-4">
                      <table className="w-full text-sm text-left text-gray-700 border-collapse">
                        <thead className="bg-gray-100 text-gray-900 font-semibold">
                          <tr>
                            <th className="p-3 border border-gray-200 rounded-tl-lg">Metric</th>
                            <th className="p-3 border border-gray-200">Company</th>
                            <th className="p-3 border border-gray-200">Industry Avg</th>
                            <th className="p-3 border border-gray-200 rounded-tr-lg">Interpretation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(result.peer_comparison.comparison_metrics).map(([metric, data]: [string, any]) => (
                            <tr key={metric} className="bg-white hover:bg-gray-50">
                              <td className="p-3 border border-gray-200 font-medium text-gray-900 capitalize">{metric.replace(/_/g, ' ')}</td>
                              <td className="p-3 border border-gray-200">{data.company}</td>
                              <td className="p-3 border border-gray-200">{data.industry_avg}</td>
                              <td className="p-3 border border-gray-200 text-xs">{data.interpretation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{result.peer_comparison.competitive_position}</p>
                  </div>
                )}

                {result.historical_context && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Historical Context</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">Revenue Trend</div>
                        <div className="text-gray-600">3-yr avg: {result.historical_context.revenue_trend.three_year_avg}%</div>
                        <div className="text-gray-600">Current: {result.historical_context.revenue_trend.current}%</div>
                        <div className="text-xs text-gray-500">Trend: {result.historical_context.revenue_trend.trend}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Profit Trend</div>
                        <div className="text-gray-600">3-yr avg: {result.historical_context.profit_trend.three_year_avg}%</div>
                        <div className="text-gray-600">Current: {result.historical_context.profit_trend.current}%</div>
                        <div className="text-xs text-gray-500">Trend: {result.historical_context.profit_trend.trend}</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-medium text-gray-900 text-sm">Key Changes</div>
                      <ul className="text-sm text-gray-700 list-disc ml-4">
                        {result.historical_context.key_changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{result.historical_context.pattern_analysis}</p>
                  </div>
                )}

                {result.sources && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Data Sources</h3>
                    <ul className="space-y-2 text-sm">
                      {result.sources.map((source, index) => (
                        <li key={index} className="flex justify-between">
                          <span className="text-gray-700">{source.type} {source.year && `(${source.year})`}</span>
                          <span className={`text-xs ${source.reliability === 'high' ? 'text-green-600' : source.reliability === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {source.reliability} reliability
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.materiality_assessment && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Materiality Assessment</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <div className="font-medium text-red-900 text-sm mb-2">High Impact</div>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {result.materiality_assessment.high_impact_factors.map((factor, index) => (
                            <li key={index}>• {factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-900 text-sm mb-2">Medium Impact</div>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {result.materiality_assessment.medium_impact_factors.map((factor, index) => (
                            <li key={index}>• {factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-green-900 text-sm mb-2">Low Impact</div>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {result.materiality_assessment.low_impact_factors.map((factor, index) => (
                            <li key={index}>• {factor}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {result.sector_context && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Sector Context</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">Sector: {result.sector_context.sector_name}</div>
                        <div className="text-gray-600">Outlook: {result.sector_context.sector_outlook}</div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Sector Trends</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.sector_context.sector_trends.map((trend, index) => (
                            <li key={index}>{trend}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{result.sector_context.company_vs_sector}</p>
                  </div>
                )}

                {result.sentiment_analysis && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Sentiment Analysis</h3>
                    <div className="flex gap-4 mb-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        result.sentiment_analysis.overall_sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        result.sentiment_analysis.overall_sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {result.sentiment_analysis.overall_sentiment}
                      </span>
                      <span className="text-sm text-gray-600">Trend: {result.sentiment_analysis.sentiment_trend}</span>
                    </div>
                    <div className="text-sm text-gray-700">
                      <div className="font-medium mb-1">Key Drivers:</div>
                      <ul className="list-disc ml-4">
                        {result.sentiment_analysis.key_sentiment_drivers.map((driver, index) => (
                          <li key={index}>{driver}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{result.sentiment_analysis.news_sentiment_summary}</p>
                  </div>
                )}

                {result.risk_matrix && (
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Risk Matrix</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="bg-red-50 p-2 rounded">
                        <div className="font-medium text-red-900">High Likelihood / High Impact</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.risk_matrix.high_likelihood_high_impact.map((risk, index) => (
                            <li key={index}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded">
                        <div className="font-medium text-yellow-900">High Likelihood / Low Impact</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.risk_matrix.high_likelihood_low_impact.map((risk, index) => (
                            <li key={index}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <div className="font-medium text-orange-900">Low Likelihood / High Impact</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.risk_matrix.low_likelihood_high_impact.map((risk, index) => (
                            <li key={index}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="font-medium text-green-900">Low Likelihood / Low Impact</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.risk_matrix.low_likelihood_low_impact.map((risk, index) => (
                            <li key={index}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {result.risk_matrix.mitigation_strategies && (
                      <div className="bg-blue-50 p-3 rounded text-sm">
                        <div className="font-medium text-blue-900 mb-1">Suggested Mitigation Strategies</div>
                        <ul className="text-gray-700 list-disc ml-4">
                          {result.risk_matrix.mitigation_strategies.map((strategy, index) => (
                            <li key={index}>{strategy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Strengths</h3>
                    <ul className="space-y-2">
                      {result.reasoning.strengths.map((strength, index) => (
                        <li key={index} className="text-gray-700 text-sm">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Weaknesses</h3>
                    <ul className="space-y-2">
                      {result.reasoning.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-gray-700 text-sm">
                          • {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Business Overview</h3>
                  <p className="text-gray-700 text-sm">{result.reasoning.business_overview}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Financial Analysis</h3>
                    <p className="text-gray-700 text-sm">{result.reasoning.financial_analysis}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Market Position</h3>
                    <p className="text-gray-700 text-sm">{result.reasoning.market_position}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Growth Potential</h3>
                  <p className="text-gray-700 text-sm">{result.reasoning.growth_potential}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Key Risks</h3>
                  <ul className="space-y-2">
                    {result.reasoning.key_risks.map((risk, index) => (
                      <li key={index} className="text-gray-700 text-sm">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Compare Companies</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Companies to compare (comma separated)</label>
                  <input
                    type="text"
                    value={compareCompanies.join(', ')}
                    onChange={(e) => setCompareCompanies(e.target.value.split(',').map(c => c.trim()).filter(c => c))}
                    placeholder="Apple, Microsoft, Google"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={compareCompaniesHandler}
                  disabled={loading || compareCompanies.length < 2}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Comparing...' : 'Compare'}
                </button>
              </div>
            </div>

            {compareResult && (
              <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Comparison Results</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Overall Ranking</h4>
                    <ol className="list-decimal ml-4">
                      {compareResult.comparison_analysis?.overall_ranking?.map((company: string, index: number) => (
                        <li key={index} className="text-gray-700">{company}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Investment Recommendation</h4>
                    <p className="text-gray-700">{compareResult.comparison_analysis?.investment_recommendation}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Differences</h4>
                    <ul className="list-disc ml-4">
                      {compareResult.key_differences?.map((diff: string, index: number) => (
                        <li key={index} className="text-gray-700">{diff}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Similarities</h4>
                    <ul className="list-disc ml-4">
                      {compareResult.similarities?.map((sim: string, index: number) => (
                        <li key={index} className="text-gray-700">{sim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Watchlist</h3>
            {watchlist.length === 0 ? (
              <p className="text-gray-500">No companies in watchlist</p>
            ) : (
              <ul className="space-y-2">
                {watchlist.map((company, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-gray-900">{company}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => alert(`Alert configuration for ${company} opened.`)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      >
                        Configure Alerts
                      </button>
                      <button
                        onClick={() => removeFromWatchlist(company)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Analysis History</h3>
            {history.length === 0 ? (
              <p className="text-gray-500">No analysis history</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="text-gray-900 font-medium">{item.companyName}</span>
                      <span className="text-gray-500 text-sm ml-2">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.recommendation === 'INVEST' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.recommendation}
                      </span>
                      <span className="text-gray-600 text-sm">{item.confidence}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
