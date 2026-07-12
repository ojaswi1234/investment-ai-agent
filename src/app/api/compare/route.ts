import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage } from '@langchain/core/messages';

// LLM will be instantiated dynamically per request

const comparePrompt = `You are an investment analyst. Compare these companies and provide investment analysis.

Format your response as JSON:
{
  "companies": ["Company1", "Company2"],
  "comparison_analysis": {
    "relative_strengths": {
      "Company1": ["strength1"],
      "Company2": ["strength1"]
    },
    "relative_weaknesses": {
      "Company1": ["weakness1"],
      "Company2": ["weakness1"]
    },
    "valuation_comparison": "Which company is better valued and why",
    "growth_comparison": "Growth prospects comparison",
    "risk_comparison": "Risk profile comparison",
    "overall_ranking": ["Company1", "Company2"],
    "investment_recommendation": "Which company to invest in and why"
  },
  "quantitative_metrics": [
    {
      "company": "Company1",
      "pe_ratio": 25.5,
      "debt_to_equity": 1.2,
      "profit_margin": 15.4
    }
  ],
  "key_differences": ["difference1", "difference2"],
  "similarities": ["similarity1", "similarity2"]
}

Compare the companies objectively. Focus on investment-relevant factors.`;

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
      temperature: 0.7,
      apiKey: apiKey,
    });

    const prompt = `${comparePrompt}\n\nCompare these companies: ${companies.join(', ')}`;
    const response = await llm.invoke([new HumanMessage(prompt)]);
    
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsedResponse);
  } catch (error) {
    return NextResponse.json({ error: 'Comparison failed' }, { status: 500 });
  }
}