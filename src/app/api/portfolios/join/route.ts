import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const { code } = await req.json();
    if (!code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 });

    let normalized = code.trim().toUpperCase();
    if (!normalized.startsWith('PORT-')) normalized = `PORT-${normalized}`;

    const rows = await sql`SELECT * FROM pt_portfolios WHERE code = ${normalized}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Portfolio not found. Check your code.' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Join portfolio error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
