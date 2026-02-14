import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const portfolioId = req.nextUrl.searchParams.get('portfolioId');
    const status = req.nextUrl.searchParams.get('status') || 'open';
    if (!portfolioId) return NextResponse.json({ error: 'portfolioId required' }, { status: 400 });

    const rows = await sql`
      SELECT * FROM pt_positions
      WHERE portfolio_id = ${portfolioId} AND status = ${status}
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Get positions error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { portfolioId, ticker, companyName, shares, buyPrice, buyDate, sellTarget, stopLoss, notes } = await req.json();

    if (!portfolioId || !ticker?.trim() || !shares || !buyPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO pt_positions (portfolio_id, ticker, company_name, shares, buy_price, buy_date, sell_target, stop_loss, notes)
      VALUES (${portfolioId}, ${ticker.trim().toUpperCase()}, ${companyName || null}, ${shares}, ${buyPrice}, ${buyDate || null}, ${sellTarget || null}, ${stopLoss || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Add position error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sql = getDb();
    const { id, ticker, companyName, shares, buyPrice, buyDate, sellTarget, stopLoss, notes, status, soldPrice, soldDate } = await req.json();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const rows = await sql`
      UPDATE pt_positions SET
        ticker = COALESCE(${ticker || null}, ticker),
        company_name = COALESCE(${companyName || null}, company_name),
        shares = COALESCE(${shares || null}, shares),
        buy_price = COALESCE(${buyPrice || null}, buy_price),
        buy_date = COALESCE(${buyDate || null}, buy_date),
        sell_target = COALESCE(${sellTarget ?? null}, sell_target),
        stop_loss = COALESCE(${stopLoss ?? null}, stop_loss),
        notes = COALESCE(${notes ?? null}, notes),
        status = COALESCE(${status || null}, status),
        sold_price = COALESCE(${soldPrice || null}, sold_price),
        sold_date = COALESCE(${soldDate || null}, sold_date)
      WHERE id = ${id}
      RETURNING *
    `;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update position error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sql = getDb();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await sql`DELETE FROM pt_positions WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete position error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
