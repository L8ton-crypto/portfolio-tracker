import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const tickers = req.nextUrl.searchParams.get('tickers');
    if (!tickers?.trim()) return NextResponse.json({ error: 'tickers required' }, { status: 400 });

    const symbols = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

    // Use Yahoo Finance v8 chart endpoint (no auth needed)
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            next: { revalidate: 60 },
          });

          if (!res.ok) return null;

          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (!result) return null;

          const meta = result.meta;
          const price = meta?.regularMarketPrice;
          const previousClose = meta?.chartPreviousClose || meta?.previousClose;
          const change = price && previousClose ? price - previousClose : 0;
          const changePercent = previousClose ? (change / previousClose) * 100 : 0;

          return {
            symbol: meta?.symbol || symbol,
            price,
            change,
            changePercent,
            previousClose,
            name: meta?.longName || meta?.shortName || symbol,
            marketState: meta?.marketState || 'UNKNOWN',
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json(
      { quotes: quotes.filter(Boolean) },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('Price fetch error:', error);
    return NextResponse.json({ quotes: [], error: 'Price fetch failed' }, { status: 200 });
  }
}
