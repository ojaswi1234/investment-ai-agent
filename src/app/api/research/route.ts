import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage } from '@langchain/core/messages';

const llm = new ChatGroq({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  apiKey: process.env.GROQ_API_KEY,
});

const researchPrompt = `You are an investment analyst. Analyze this company and give a comprehensive investment recommendation.

Format your response as JSON:
{
  "company": "Company Name",
  "recommendation": "INVEST" or "PASS",
  "confidence": number (0-100),
  "reasoning": {
    "business_overview": "What the company does",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "financial_analysis": "Financial health summary",
    "market_position": "Competitive position",
    "growth_potential": "Growth prospects",
    "key_risks": ["risk1", "risk2"]
  },
  "investment_thesis": "Why this recommendation",
  "suggested_time_horizon": "Short-term (0-1 year) | Medium-term (1-3 years) | Long-term (3+ years)",
  "peer_comparison": {
    "competitors": ["Competitor1", "Competitor2", "Competitor3"],
    "comparison_metrics": {
      "P/E_ratio": {"company": number, "industry_avg": number, "interpretation": "string"},
      "revenue_growth": {"company": number, "industry_avg": number, "interpretation": "string"},
      "profit_margin": {"company": number, "industry_avg": number, "interpretation": "string"},
      "debt_to_equity": {"company": number, "industry_avg": number, "interpretation": "string"}
    },
    "competitive_position": "Summary of competitive standing"
  },
  "historical_context": {
    "revenue_trend": {"three_year_avg": number, "current": number, "trend": "improving/stable/declining"},
    "profit_trend": {"three_year_avg": number, "current": number, "trend": "improving/stable/declining"},
    "key_changes": ["Significant change1", "Significant change2"],
    "pattern_analysis": "Analysis of historical patterns"
  },
  "sources": [
    {"type": "Annual Report", "year": "2024", "reliability": "high"},
    {"type": "Market Data", "source": "general market knowledge", "reliability": "medium"}
  ],
  "materiality_assessment": {
    "high_impact_factors": ["factor1", "factor2"],
    "medium_impact_factors": ["factor1", "factor2"],
    "low_impact_factors": ["factor1", "factor2"]
  },
  "sector_context": {
    "sector_name": "Technology",
    "sector_outlook": "positive/neutral/negative",
    "sector_trends": ["trend1", "trend2"],
    "company_vs_sector": "How company compares to sector"
  },
  "sentiment_analysis": {
    "overall_sentiment": "positive/neutral/negative",
    "sentiment_trend": "improving/stable/declining",
    "key_sentiment_drivers": ["driver1", "driver2"],
    "news_sentiment_summary": "Summary of recent news sentiment"
  },
  "risk_matrix": {
    "high_likelihood_high_impact": ["risk1"],
    "high_likelihood_low_impact": ["risk1"],
    "low_likelihood_high_impact": ["risk1"],
    "low_likelihood_low_impact": ["risk1"],
    "mitigation_strategies": ["strategy1", "strategy2"]
  },
  "financial_health_score": {
    "overall_score": number (0-100),
    "score_category": "excellent/good/fair/poor",
    "component_scores": {
      "profitability": number,
      "solvency": number,
      "efficiency": number,
      "growth": number
    },
    "trend": "improving/stable/declining"
  }
}

Analyze the company based on your knowledge. Include realistic estimates for metrics based on general knowledge. Be objective and specific.`;

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const prompt = `${researchPrompt}\n\nAnalyze this company: ${companyName}`;
    const response = await llm.invoke([new HumanMessage(prompt)]);
    
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}