import { NextRequest, NextResponse } from 'next/server';
import { getDb, generatePortfolioCode } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const rows = await sql`SELECT * FROM pt_portfolios WHERE id = ${id}`;
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Get portfolio error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { name, currency } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    let code = generatePortfolioCode();
    let rows;
    let attempts = 0;
    while (attempts < 10) {
      try {
        rows = await sql`
          INSERT INTO pt_portfolios (name, code, currency)
          VALUES (${name.trim()}, ${code}, ${currency || 'USD'})
          RETURNING *
        `;
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('unique') || msg.includes('duplicate')) {
          code = generatePortfolioCode();
          attempts++;
        } else throw err;
      }
    }

    if (!rows || rows.length === 0) return NextResponse.json({ error: 'Failed' }, { status: 500 });
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Create portfolio error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
