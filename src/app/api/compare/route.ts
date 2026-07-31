import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';
import { search } from 'duck-duck-scrape';

// 1. Define the Zod Schema for robust JSON output
const compareSchema = z.object({
  companies: z.array(z.string()),
  comparison_analysis: z.object({
    relative_strengths: z.record(z.string(), z.array(z.string())),
    relative_weaknesses: z.record(z.string(), z.array(z.string())),
    valuation_comparison: z.string(),
    growth_comparison: z.string(),
    risk_comparison: z.string(),
    overall_ranking: z.array(z.string()),
    investment_recommendation: z.string()
  }),
  quantitative_metrics: z.array(z.object({
    company: z.string(),
    pe_ratio: z.number().nullable(),
    debt_to_equity: z.number().nullable(),
    profit_margin: z.number().nullable()
  })),
  key_differences: z.array(z.string()),
  similarities: z.array(z.string())
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
    const { companies, apiKey, model } = await request.json();

    if (!companies || !Array.isArray(companies) || companies.length < 2) {
      return NextResponse.json({ error: 'At least 2 companies required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key is required. Please set it in the Settings tab.' }, { status: 401 });
    }

    const llm = new ChatGroq({
      model: model || 'llama-3.3-70b-versatile',
      temperature: 0.1,
      apiKey: apiKey,
    });

    const llmWithTools = llm.bindTools(tools);
    
    let messages: any[] = [
      new SystemMessage("You are an expert investment analyst. You MUST use your tools to gather real-time financial data, recent news, and perform accurate calculations before comparing these companies. Do not hallucinate metrics."),
      new HumanMessage(`Please research and compare these companies objectively: ${companies.join(', ')}. Use your tools to look up their tickers, fetch stock data, and search recent news.`)
    ];

    // Simple Agent Loop (max 5 iterations)
    for (let i = 0; i < 5; i++) {
      const aiMsg = await llmWithTools.invoke(messages);
      messages.push(aiMsg);

      if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
        break; // Finished info gathering
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

    // 3. Final structured output generation using Zod Schema
    messages.push(new SystemMessage("Now, based on the research you conducted, generate the final comparative investment analysis using the exact provided structured schema format."));
    
    const structuredLlm = llm.withStructuredOutput(compareSchema, { name: "comparison_report" });
    const finalReport = await structuredLlm.invoke(messages);

    return NextResponse.json(finalReport);
  } catch (error: any) {
    console.error("Comparison API Error:", error);
    return NextResponse.json({ error: error.message || 'Comparison failed' }, { status: 500 });
  }
}