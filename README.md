# Investment Research Agent

This is a simple investment research tool that uses AI to analyze companies and give investment recommendations. I built it using Next.js, LangChain, and Groq's Llama 3.3.

## Overview

This is an AI-powered investment research tool that analyzes companies and provides comprehensive investment recommendations. Built using Next.js, LangChain, and Groq's Llama 3.3.

When you enter a company name, the agent uses Llama 3.3 to:
- Analyze the company's business model, finances, and market position
- Perform peer comparisons and historical trend analysis
- Assess materiality, sector context, and news sentiment
- Evaluate risks and calculate a financial health score
- Provide an INVEST or PASS recommendation with a confidence score
- Maintain a watchlist, analysis history, and a company comparison tool

## How to run it

You'll need:
- Node.js 18+
- A Groq API key (free at https://console.groq.com/)

### Running it

1. Install dependencies:
```bash
npm install
```

2. Set up your API key:
```bash
cp .env.local.example .env.local
```
Then add your Groq API key to `.env.local`

3. Run the dev server:
```bash
npm run dev
```

4. Go to http://localhost:3000

### Building for production
```bash
npm run build
npm start
```

## How it works

There's a frontend (React/Next.js) that sends company names to a backend API route. The backend uses LangChain to call Groq's Llama 3.3 with a prompt that asks for structured investment analysis. The response is parsed as JSON and displayed on the frontend.

Pretty straightforward architecture - nothing too complex.

## Key decisions & trade-offs

- **Next.js**: Chosen for a modern full-stack approach with built-in API routes.
- **LangChain**: Simplifies working with LLMs and makes it easy to parse structured JSON outputs.
- **Groq (Llama 3.3)**: Provides incredibly fast and free API access, with excellent performance for complex analysis.
- **TypeScript**: Helps catch errors early and provides solid type definitions for the complex AI response object.
- **Tailwind CSS**: Allows for rapid UI development while maintaining a sleek, professional, and clean design.
- **In-memory storage**: Used for Watchlist and History to keep the project lightweight and simple to run without needing a database setup.

## Example runs

**Apple**: INVEST (85% confidence) - Strong ecosystem and finances
**Tesla**: INVEST (72% confidence) - Good growth but execution risks  
**Nokia**: PASS (68% confidence) - Too much competition, slow growth

## What I would improve with more time
- Actual financial data from APIs (Yahoo Finance, etc.)
- User accounts to save analyses
- Better caching so you don't re-analyze the same company
- Streaming responses
- More robust error handling
- Tests

## Notes

Built this for the InsideIIM assignment. Used AI to help with some of the coding and documentation, but I understand how everything works and can explain it.