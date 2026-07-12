import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage (in production, use a database)
interface HistoryItem {
  id: string;
  companyName: string;
  timestamp: string;
  recommendation: string;
  confidence: number;
}

let history: HistoryItem[] = [];

export async function GET() {
  return NextResponse.json({ history: history.slice(-20) }); // Return last 20 items
}

export async function POST(request: NextRequest) {
  const { companyName, recommendation, confidence } = await request.json();
  
  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  const historyItem: HistoryItem = {
    id: Date.now().toString(),
    companyName,
    timestamp: new Date().toISOString(),
    recommendation: recommendation || 'N/A',
    confidence: confidence || 0
  };

  history.push(historyItem);
  return NextResponse.json({ history: history.slice(-20) });
}