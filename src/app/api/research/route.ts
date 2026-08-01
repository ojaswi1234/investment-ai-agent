import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';
import { search } from 'duck-duck-scrape';
import { evaluate } from 'mathjs';
import { checkRateLimit, responseCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 1. Define the Zod Schema for robust JSON output (No more regex parsing)
const researchSchema = z.object({
  company: z.string(),
  recommendation: z.enum(["INVEST", "PASS"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.object({
    business_overview: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    financial_analysis: z.string(),
    market_position: z.string(),
    growth_potential: z.string(),
    key_risks: z.array(z.string())
  }),
  investment_thesis: z.string(),
  suggested_time_horizon: z.string(),
  peer_comparison: z.object({
    competitors: z.array(z.string()),
    comparison_metrics: z.record(z.string(), z.object({
      company: z.number().nullable().optional().describe("Numeric value for the main target company"),
      industry_avg: z.number().nullable().optional().describe("Numeric average value across the competitors"),
      interpretation: z.string().optional().describe("Brief interpretation of how the company compares")
    })).describe("A dictionary where EACH KEY is a METRIC NAME (e.g. 'P/E Ratio', 'Revenue Growth %', 'Profit Margin %') and EACH VALUE is an object with 'company' (the target company's number) and 'industry_avg' (the competitors' average number). Example: { 'P/E Ratio': { company: 28.5, industry_avg: 24.1, interpretation: 'Slightly premium valuation' } }. NEVER use 'company' or 'industry_avg' as top-level metric name keys."),
    competitive_position: z.string()
  }),
  historical_context: z.object({
    revenue_trend: z.object({
      three_year_avg: z.number().optional(),
      current: z.number().optional(),
      trend: z.string().optional()
    }).optional(),
    profit_trend: z.object({
      three_year_avg: z.number().optional(),
      current: z.number().optional(),
      trend: z.string().optional()
    }).optional(),
    key_changes: z.array(z.string()).optional(),
    pattern_analysis: z.string().optional()
  }).optional(),
  sources: z.array(z.object({
    type: z.string(),
    year: z.string(),
    reliability: z.string(),
    source: z.string().optional()
  })),
  materiality_assessment: z.object({
    high_impact_factors: z.array(z.string()),
    medium_impact_factors: z.array(z.string()),
    low_impact_factors: z.array(z.string())
  }),
  sector_context: z.object({
    sector_name: z.string(),
    sector_outlook: z.string(),
    sector_trends: z.array(z.string()),
    company_vs_sector: z.string()
  }),
  sentiment_analysis: z.object({
    overall_sentiment: z.string(),
    sentiment_trend: z.string(),
    key_sentiment_drivers: z.array(z.string()),
    news_sentiment_summary: z.string()
  }),
  risk_matrix: z.object({
    high_likelihood_high_impact: z.array(z.string()),
    high_likelihood_low_impact: z.array(z.string()),
    low_likelihood_high_impact: z.array(z.string()),
    low_likelihood_low_impact: z.array(z.string()),
    mitigation_strategies: z.array(z.string())
  }),
  financial_health_score: z.object({
    overall_score: z.number().min(0).max(100),
    score_category: z.string(),
    component_scores: z.object({
      profitability: z.number(),
      solvency: z.number(),
      efficiency: z.number(),
      growth: z.number()
    }),
    trend: z.string()
  })
});

// 2. Define Tools to eliminate hallucination
const getStockData = new DynamicStructuredTool({
  name: "get_stock_data",
  description: "Get real-time stock data, price, and financial metrics from Yahoo Finance for a given ticker symbol.",
  schema: z.object({
    ticker: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)"),
  }),
  func: async ({ ticker }) => {
    try {
      const quote: any = await yahooFinance.quote(ticker);
      const metrics: any = await yahooFinance.quoteSummary(ticker, { modules: ["financialData", "defaultKeyStatistics", "incomeStatementHistory"] });
      
      const now = new Date();
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(now.getFullYear() - 3);
      
      let oneYearGrowth = 'N/A';
      let threeYearGrowth = 'N/A';
      try {
        const history: any = await yahooFinance.historical(ticker, { period1: threeYearsAgo, period2: now, interval: '1mo' });
        if (history && history.length > 0) {
          const currentPrice = history[history.length - 1]?.close;
          const oneYearAgoPrice = history.length >= 13 ? history[history.length - 13]?.close : null;
          const threeYearsAgoPrice = history[0]?.close;
          
          if (currentPrice && oneYearAgoPrice) oneYearGrowth = ((currentPrice - oneYearAgoPrice) / oneYearAgoPrice * 100).toFixed(2) + '%';
          if (currentPrice && threeYearsAgoPrice) threeYearGrowth = ((currentPrice - threeYearsAgoPrice) / threeYearsAgoPrice * 100).toFixed(2) + '%';
        }
      } catch (e) {
        // ignore history errors
      }

      const incomeHistory = metrics.incomeStatementHistory?.incomeStatementHistory?.map((s: any) => ({
        date: s.endDate?.fmt,
        totalRevenue: s.totalRevenue?.raw,
        netIncome: s.netIncome?.raw,
      })) || [];
      
      const cleanData = {
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        currency: quote.currency,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE || quote.forwardPE,
        priceToBook: quote.priceToBook,
        eps: quote.epsTrailingTwelveMonths,
        profitMargin: metrics.financialData?.profitMargins,
        operatingMargin: metrics.financialData?.operatingMargins,
        returnOnAssets: metrics.financialData?.returnOnAssets,
        returnOnEquity: metrics.financialData?.returnOnEquity,
        revenueGrowth: metrics.financialData?.revenueGrowth,
        freeCashflow: metrics.financialData?.freeCashflow,
        debtToEquity: metrics.financialData?.debtToEquity,
        totalDebt: metrics.financialData?.totalDebt,
        currentRatio: metrics.financialData?.currentRatio,
        shortRatio: metrics.defaultKeyStatistics?.shortRatio,
        analystTargetPrice: metrics.financialData?.targetMeanPrice,
        analystRating: metrics.financialData?.recommendationKey,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        historical_price_growth: {
          oneYear: oneYearGrowth,
          threeYear: threeYearGrowth
        },
        annual_financial_statements: incomeHistory
      };
      return JSON.stringify(cleanData);
    } catch (e: any) {
      return `Failed to fetch stock data: ${e.message}`;
    }
  },
});

const webSearch = new DynamicStructuredTool({
  name: "web_search",
  description: "Search the web for recent news, sector trends, or general information about a company.",
  schema: z.object({
    query: z.string().describe("The search query"),
  }),
  func: async ({ query }) => {
    try {
      const results = await search(query);
      return JSON.stringify(results.results.slice(0, 3).map(r => ({ title: r.title, description: r.description, url: r.url })));
    } catch (e: any) {
      return `Search failed: ${e.message}`;
    }
  },
});

const calculator = new DynamicStructuredTool({
  name: "calculator",
  description: "Evaluate a mathematical expression. Useful for calculating P/E ratios, averages, or growth rates.",
  schema: z.object({
    expression: z.string().describe("The mathematical expression to evaluate (e.g., '100 / 12')"),
  }),
  func: async ({ expression }) => {
    try {
      const result = evaluate(expression);
      return result.toString();
    } catch (e) {
      return "Calculation failed.";
    }
  },
});

const tools = [getStockData, webSearch, calculator];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

export async function POST(request: NextRequest) {
  let requestData;
  try {
    requestData = await request.json();
  } catch(e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { companyName, apiKey, model } = requestData;

  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'Groq API Key is required. Please set it in the Settings tab.' }, { status: 401 });
  }

  // Rate Limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (ip !== 'unknown' && !checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded (Max 10 requests per hour).' }, { status: 429 });
  }

  const cacheKey = `research-${companyName.toLowerCase()}`;
  const cachedResponse = responseCache.get(cacheKey);

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (payload: any) => {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(payload) + '\n'));
      };

      // Pad the stream with 4KB of spaces to force Next.js/Vercel to flush the buffer immediately
      controller.enqueue(new TextEncoder().encode(' '.repeat(4096) + '\n'));

      // If cached, fast-forward the loader and return instantly
      if (cachedResponse) {
        sendUpdate({ type: 'flag', step: 'web-search' });
        sendUpdate({ type: 'flag', step: 'financial-model' });
        sendUpdate({ type: 'flag', step: 'peer-analysis' });
        sendUpdate({ type: 'flag', step: 'sentiment-scan' });
        sendUpdate({ type: 'flag', step: 'risk-matrix' });
        sendUpdate({ type: 'result', data: JSON.parse(cachedResponse) });
        controller.close();
        return;
      }

      try {
        const llm = new ChatGroq({
          model: model || 'llama-3.3-70b-versatile',
          temperature: 0.1, // low temp for analytical accuracy
          apiKey: apiKey,
        });

        const llmWithTools = llm.bindTools(tools);
        
        let messages: any[] = [
          new SystemMessage("You are an expert, objective, and highly analytical Wall Street quantitative analyst. Your goal is to provide a balanced and rigorous investment analysis using strict value investing criteria. You MUST use your tools to gather real-time financial data, recent news, and perform accurate calculations. CRITICAL: Do not hallucinate metrics. You must extract exact numbers from the get_stock_data tool. To issue an 'INVEST' rating, the company should generally meet strict quantitative quality metrics: reasonable valuation (e.g., P/E < 25, P/B < 4), healthy leverage (e.g., Debt-to-Equity < 1.5), and solid profitability. If the company is wildly overvalued, highly leveraged, or has deteriorating fundamentals, you MUST issue a 'PASS' rating. Provide a fair, balanced assessment of both their upside potential and their downside risks. When calling tools, ensure your arguments are valid JSON.\n\nCRITICAL SCHEMA RULE for 'comparison_metrics': This field is a dictionary where each KEY is a metric NAME (e.g. 'P/E Ratio', 'Revenue Growth %', 'Debt-to-Equity') and each VALUE is an object containing 'company' (a number) and 'industry_avg' (a number). CORRECT example: { 'P/E Ratio': { company: 28.5, industry_avg: 24.1, interpretation: 'Slight premium' }, 'Profit Margin %': { company: 25.3, industry_avg: 18.7 } }. WRONG example: { company: 100, industry_avg: 80 }. Never use 'company' or 'industry_avg' as top-level keys."),
          new HumanMessage(`Please thoroughly research and analyze this company: ${companyName}. \n\nCRITICAL INSTRUCTIONS TO PREVENT RUSHING:\n1. First, call get_stock_data on ${companyName}.\n2. Second, call web_search to identify recent news and 2-3 top industry competitors.\n3. Third, call get_stock_data on those 2-3 competitors to perform a robust, data-backed peer comparison.\n\nYou must not stop gathering information until you have fetched the stock data for the main company AND its competitors. Every claim and comparison must be supported by the data you fetch.`)
        ];

        const uiSteps = ['web-search', 'financial-model', 'peer-analysis', 'sentiment-scan', 'risk-matrix', 'risk-matrix', 'risk-matrix', 'risk-matrix'];

        // Simple Agent Loop (max 8 iterations)
        for (let i = 0; i < 8; i++) {
          sendUpdate({ type: 'flag', step: uiSteps[i] || 'risk-matrix' });

          // Enforce minimum time per step to demonstrate thoroughness and sync with loader
          await new Promise(resolve => setTimeout(resolve, 2000));

          let aiMsg;
          try {
            aiMsg = await llmWithTools.invoke(messages);
          } catch (e: any) {
            console.warn("Groq Tool Invocation Error, retrying...", e.message);
            try {
               aiMsg = await llmWithTools.invoke(messages);
            } catch (retryErr: any) {
               break;
            }
          }

          if (aiMsg) messages.push(aiMsg);

          if (!aiMsg?.tool_calls || aiMsg.tool_calls.length === 0) {
            break; // LLM has finished gathering info
          }

          for (const toolCall of aiMsg.tool_calls) {
            const selectedTool = toolsByName[toolCall.name];
            let toolResult = "";
            if (selectedTool) {
              toolResult = await (selectedTool as any).invoke(toolCall.args);
            } else {
              toolResult = `Error: Tool ${toolCall.name} not found`;
            }
            messages.push(new ToolMessage({
              tool_call_id: toolCall.id!,
              content: toolResult
            }));
          }
        }

        // Final structured output generation
        sendUpdate({ type: 'flag', step: 'final-synthesis' });
        messages.push(new SystemMessage("Now, based on the rigorous research you conducted, generate the final comprehensive investment analysis report using the exact provided structured schema format. Be objective and balanced. Highlight both key strengths and critical weaknesses. Set the recommendation to 'INVEST' or 'PASS' based on a fair weighing of the data, and assign an appropriate financial health score."));
        
        const structuredLlm = llm.withStructuredOutput(researchSchema, { name: "research_report" });
        const finalReport = await structuredLlm.invoke(messages);
        
        responseCache.set(cacheKey, JSON.stringify(finalReport));
        
        // Send complete flag and wait 1500ms so loader can animate to 100%
        sendUpdate({ type: 'flag', step: 'complete' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        sendUpdate({ type: 'result', data: finalReport });
      } catch (e: any) {
        console.error("Research Error:", e);
        sendUpdate({ type: 'error', message: e.message || 'An error occurred during research' });
      } finally {
        if (typeof global.gc === 'function') global.gc();
        controller.close();
      }
    }
  });

  return new Response(stream, { 
    headers: { 
      'Content-Type': 'application/x-ndjson', 
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff'
    } 
  });
}