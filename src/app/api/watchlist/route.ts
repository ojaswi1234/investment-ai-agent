import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage (in production, use a database)
let watchlist: string[] = [];

export async function GET() {
  return NextResponse.json({ companies: watchlist });
}

export async function POST(request: NextRequest) {
  const { companyName } = await request.json();
  
  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  if (!watchlist.includes(companyName)) {
    watchlist.push(companyName);
  }

  return NextResponse.json({ companies: watchlist });
}

export async function DELETE(request: NextRequest) {
  const { companyName } = await request.json();
  
  if (!companyName) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  watchlist = watchlist.filter(c => c !== companyName);
  return NextResponse.json({ companies: watchlist });
}