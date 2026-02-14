import { neon } from '@neondatabase/serverless';

export function getDb() {
  return neon(process.env.DATABASE_URL!);
}

/** Generate a portfolio join code like PORT-7X3K */
export function generatePortfolioCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PORT-${code}`;
}

export async function initDb() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS pt_portfolios (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      currency TEXT DEFAULT 'USD',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pt_positions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      portfolio_id TEXT NOT NULL REFERENCES pt_portfolios(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      company_name TEXT,
      shares NUMERIC NOT NULL DEFAULT 0,
      buy_price NUMERIC NOT NULL DEFAULT 0,
      buy_date DATE,
      sell_target NUMERIC,
      stop_loss NUMERIC,
      notes TEXT,
      status TEXT DEFAULT 'open',
      sold_price NUMERIC,
      sold_date DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pt_watchlist (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      portfolio_id TEXT NOT NULL REFERENCES pt_portfolios(id) ON DELETE CASCADE,
      ticker TEXT NOT NULL,
      company_name TEXT,
      target_buy NUMERIC,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_pt_positions_portfolio ON pt_positions(portfolio_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pt_positions_status ON pt_positions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pt_watchlist_portfolio ON pt_watchlist(portfolio_id)`;
}
