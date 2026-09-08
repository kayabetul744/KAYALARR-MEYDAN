/**
 * Paylaşılan Postgres bağlantısı (Vercel Postgres / Neon uyumlu).
 *
 * Vercel'de Postgres storage eklendiğinde `POSTGRES_URL` otomatik olarak
 * ortam değişkenine enjekte edilir — kod tarafında hiçbir değişiklik
 * gerekmez. Yerel geliştirmede `DATABASE_URL` kullanılabilir (bkz. .env.example).
 */

import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"];
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL (veya POSTGRES_URL) tanımlı değil — Katkı/KP defteri özellikleri için bir Postgres bağlantısı gerekir.",
      );
    }
    pool = new Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}
