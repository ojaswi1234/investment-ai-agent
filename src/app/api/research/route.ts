import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, ToolMessage, AIMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';
import { search } from 'duck-duck-scrape';

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
    comparison_metrics: z.record(z.object({
      company: z.number(),
      industry_avg: z.number(),
      interpretation: z.string()
    })),
    competitive_position: z.string()
  }),
  historical_context: z.object({
    revenue_trend: z.object({
      three_year_avg: z.number(),
      current: z.number(),
      trend: z.string()
    }),
    profit_trend: z.object({
      three_year_avg: z.number(),
      current: z.number(),
      trend: z.string()
    }),
    key_changes: z.array(z.string()),
    pattern_analysis: z.string()
  }),
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
      const quote = await yahooFinance.quote(ticker);
      const metrics = await yahooFinance.quoteSummary(ticker, { modules: ["financialData", "defaultKeyStatistics"] });
      return JSON.stringify({ quote, metrics });
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
      // Return top 3 results
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
      // Safe eval
      const result = new Function(`return ${expression}`)();
      return result.toString();
    } catch (e) {
      return "Calculation failed.";
    }
  },
});

const tools = [getStockData, webSearch, calculator];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

export async function POST(request: NextRequest) {
  try {
    const { companyName, apiKey, model } = await request.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key is required. Please set it in the Settings tab.' }, { status: 401 });
    }

    const llm = new ChatGroq({
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.1, // low temp for analytical accuracy
      apiKey: apiKey,
    });

    const llmWithTools = llm.bindTools(tools);
    
    let messages: any[] = [
      new SystemMessage("You are an expert investment analyst. You MUST use your tools to gather real-time financial data, recent news, and perform accurate calculations before making an investment recommendation. Do not hallucinate metrics."),
      new HumanMessage(`Please research and analyze this company: ${companyName}. Use your tools to look up the ticker, fetch stock data, search recent news, and calculate metrics.`)
    ];

    // Simple Agent Loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const aiMsg = await llmWithTools.invoke(messages);
      messages.push(aiMsg);

      if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
        break; // LLM has finished gathering info
      }

      for (const toolCall of aiMsg.tool_calls) {
        const selectedTool = toolsByName[toolCall.name];
        let toolResult = "";
        if (selectedTool) {
          toolResult = await selectedTool.invoke(toolCall.args);
        } else {
          toolResult = `Error: Tool ${toolCall.name} not found`;
        }
        messages.push(new ToolMessage({
          tool_call_id: toolCall.id!,
          content: toolResult
        }));
      }
    }

    // 3. Final structured output generation using Zod Schema (fixes regex fragility)
    messages.push(new SystemMessage("Now, based on the research you conducted, generate the final comprehensive investment analysis report using the exact provided structured schema format."));
    
    const structuredLlm = llm.withStructuredOutput(researchSchema, { name: "research_report" });
    const finalReport = await structuredLlm.invoke(messages);

    return NextResponse.json(finalReport);
  } catch (error: any) {
    console.error("Research API Error:", error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}