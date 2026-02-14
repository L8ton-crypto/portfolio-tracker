import { NextRequest, NextResponse } from 'next/server';

interface YahooQuoteResult {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  shortName?: string;
  longName?: string;
  marketState?: string;
  regularMarketTime?: number;
}

interface YahooResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[];
  };
}

export async function GET(req: NextRequest) {
  try {
    const tickers = req.nextUrl.searchParams.get('tickers');
    if (!tickers?.trim()) return NextResponse.json({ error: 'tickers required' }, { status: 400 });

    const symbols = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean).join(',');

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,shortName,longName,marketState,regularMarketTime`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 60 }, // cache for 60s
    });

    if (!res.ok) {
      // Fallback: return empty prices so UI doesn't break
      return NextResponse.json({ quotes: [], error: 'Price fetch failed', status: res.status });
    }

    const data: YahooResponse = await res.json();
    const quotes = (data.quoteResponse?.result || []).map((q: YahooQuoteResult) => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      previousClose: q.regularMarketPreviousClose,
      name: q.longName || q.shortName,
      marketState: q.marketState,
      lastUpdated: q.regularMarketTime,
    }));

    return NextResponse.json({ quotes }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json({ quotes: [], error: 'Price fetch failed' }, { status: 200 });
  }
}
