import { NextResponse } from 'next/server';
import { clearCache } from '@/lib/cache';

export async function DELETE() {
  clearCache();
  
  // Attempt to garbage collect if exposed in Node.js (Vercel/Render)
  if (typeof global.gc === 'function') {
    global.gc();
  }

  return NextResponse.json({ success: true, message: 'Server memory and analysis caches successfully cleared.' });
}
