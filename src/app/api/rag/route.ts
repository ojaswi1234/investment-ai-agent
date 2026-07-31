import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage } from '@langchain/core/messages';

if (typeof global !== 'undefined') {
  if (!(global as any).DOMMatrix) (global as any).DOMMatrix = class {};
  if (!(global as any).Path2D) (global as any).Path2D = class {};
  if (!(global as any).ImageData) (global as any).ImageData = class {};
}
const pdfParse = require('pdf-parse');
// Dynamic import of transformers will be done in getExtractor

// Global cache for the embedding model to avoid reloading
let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    // Lazy load the embedding pipeline
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const query = formData.get('query') as string;
    const apiKey = formData.get('apiKey') as string;
    const modelName = formData.get('model') as string;

    if (!file || !query) {
      return NextResponse.json({ error: 'File and query are required' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API Key is required' }, { status: 401 });
    }

    // 1. Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // 2. Chunking
    const chunkSize = 1000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }

    // 3. Generate Embeddings (Local ML)
    const extract = await getExtractor();
    
    // Embed the query
    const queryOutput = await extract(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(queryOutput.data);

    // Score chunks
    // To save time in serverless, we'll only embed the first 50 chunks (approx 50k chars) if it's huge
    const maxChunks = Math.min(chunks.length, 50);
    const scoredChunks = [];

    for (let i = 0; i < maxChunks; i++) {
      const chunkOutput = await extract(chunks[i], { pooling: 'mean', normalize: true });
      const chunkEmbedding = Array.from(chunkOutput.data);
      const score = cosineSimilarity(queryEmbedding as number[], chunkEmbedding as number[]);
      scoredChunks.push({ text: chunks[i], score });
    }

    // 4. Retrieve Top 3
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 3).map(c => c.text);
    const context = topChunks.join('\n\n---\n\n');

    // 5. Generate Response via LLM
    const llm = new ChatGroq({
      model: modelName || 'llama-3.3-70b-versatile',
      temperature: 0.3, // Low temperature for factual RAG
      apiKey: apiKey,
    });

    const prompt = `You are an expert investment analyst. Answer the user's question based ONLY on the following context extracted from an SEC filing/document. If the answer is not in the context, say "I cannot find the answer in the provided document."\n\nContext:\n${context}\n\nQuestion: ${query}`;
    
    const response = await llm.invoke([new HumanMessage(prompt)]);

    return NextResponse.json({ 
      answer: response.content,
      retrieved_chunks: topChunks.length
    });

  } catch (error: any) {
    console.error("RAG Error:", error);
    return NextResponse.json({ error: error.message || 'RAG Analysis failed' }, { status: 500 });
  }
}
