import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const portfolioId = req.nextUrl.searchParams.get('portfolioId');
    if (!portfolioId) return NextResponse.json({ error: 'portfolioId required' }, { status: 400 });

    const rows = await sql`
      SELECT * FROM pt_watchlist WHERE portfolio_id = ${portfolioId} ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Get watchlist error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { portfolioId, ticker, companyName, targetBuy, notes } = await req.json();
    if (!portfolioId || !ticker?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const rows = await sql`
      INSERT INTO pt_watchlist (portfolio_id, ticker, company_name, target_buy, notes)
      VALUES (${portfolioId}, ${ticker.trim().toUpperCase()}, ${companyName || null}, ${targetBuy || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Add watchlist error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM pt_watchlist WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete watchlist error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
