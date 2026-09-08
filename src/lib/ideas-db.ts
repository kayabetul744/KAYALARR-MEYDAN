/**
 * Fikirlerin, katkıların ve Katkı Puanı (KP) defterinin kalıcı katmanı.
 *
 * Vercel Postgres / Neon ile çalışacak şekilde tasarlanmıştır (bkz. db.ts).
 * Bağlantı tanımlı değilse her fonksiyon anlaşılır bir hata döner — kullanıcı
 * arayüzü bu durumu "Katkı/KP özellikleri şu an kullanılamıyor" olarak
 * gösterir; 3B dünya ve AI Fikir Çekirdeği'nin geri kalanı bundan etkilenmez.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getPool } from "@/lib/db";
import { ideaPlanSchema, nextRegion, type IdeaPlan, type RegionName } from "@/lib/idea-core";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meydan_ideas (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  region TEXT NOT NULL,
  tema TEXT NOT NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  suggested_kp INTEGER NOT NULL,
  source TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meydan_contributions (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES meydan_ideas(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  kp_awarded INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
`;

let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((error: unknown) => {
        schemaReady = undefined;
        throw error;
      });
  }
  return schemaReady;
}

export interface IdeaRecord {
  id: number;
  text: string;
  region: RegionName;
  tema: string;
  title: string;
  color: string;
  suggestedKp: number;
  source: "ai" | "fallback";
  ownerName: string;
  createdAt: string;
  pendingContributions: number;
  approvedContributions: number;
}

export interface ContributionRecord {
  id: number;
  ideaId: number;
  contributorName: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  kpAwarded: number | null;
  createdAt: string;
}

function rowToIdea(row: Record<string, unknown>): IdeaRecord {
  return {
    id: Number(row["id"]),
    text: String(row["text"]),
    region: row["region"] as RegionName,
    tema: String(row["tema"]),
    title: String(row["title"]),
    color: String(row["color"]),
    suggestedKp: Number(row["suggested_kp"]),
    source: row["source"] as "ai" | "fallback",
    ownerName: String(row["owner_name"]),
    createdAt: String(row["created_at"]),
    pendingContributions: Number(row["pending_contributions"] ?? 0),
    approvedContributions: Number(row["approved_contributions"] ?? 0),
  };
}

function rowToContribution(row: Record<string, unknown>): ContributionRecord {
  return {
    id: Number(row["id"]),
    ideaId: Number(row["idea_id"]),
    contributorName: String(row["contributor_name"]),
    description: String(row["description"]),
    status: row["status"] as ContributionRecord["status"],
    kpAwarded: row["kp_awarded"] == null ? null : Number(row["kp_awarded"]),
    createdAt: String(row["created_at"]),
  };
}

const ownerNameSchema = z.string().trim().min(1, "Kullanıcı adı gerekli.").max(60);

/** Fikri, AI/fallback analizinden sonra kalıcı deftere kaydeder. */
export const saveIdea = createServerFn({ method: "POST" })
  .validator(
    (input: { text: string; plan: IdeaPlan; source: "ai" | "fallback"; ownerName: string }) =>
      z
        .object({
          text: z.string().trim().min(3).max(2000),
          plan: ideaPlanSchema,
          source: z.enum(["ai", "fallback"]),
          ownerName: ownerNameSchema,
        })
        .parse(input),
  )
  .handler(async ({ data }): Promise<IdeaRecord> => {
    await ensureSchema();
    const result = await getPool().query(
      `INSERT INTO meydan_ideas (text, region, tema, title, color, suggested_kp, source, owner_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *, 0 AS pending_contributions, 0 AS approved_contributions`,
      [
        data.text,
        data.plan.bolge,
        data.plan.tema,
        data.plan.baslik,
        data.plan.renk,
        data.plan.onerilenKatkiPuani,
        data.source,
        data.ownerName,
      ],
    );
    return rowToIdea(result.rows[0]);
  });

/** Son fikirleri, bekleyen/onaylanan katkı sayılarıyla birlikte listeler. */
export const listIdeas = createServerFn({ method: "GET" }).handler(
  async (): Promise<IdeaRecord[]> => {
    await ensureSchema();
    const result = await getPool().query(`
    SELECT
      i.*,
      COUNT(*) FILTER (WHERE c.status = 'pending')::int AS pending_contributions,
      COUNT(*) FILTER (WHERE c.status = 'approved')::int AS approved_contributions
    FROM meydan_ideas i
    LEFT JOIN meydan_contributions c ON c.idea_id = i.id
    GROUP BY i.id
    ORDER BY i.created_at DESC
    LIMIT 100
  `);
    return result.rows.map(rowToIdea);
  },
);

/** Bir fikre yeni bir katkı önerisi sunar (durum: pending). */
export const proposeContribution = createServerFn({ method: "POST" })
  .validator((input: { ideaId: number; contributorName: string; description: string }) =>
    z
      .object({
        ideaId: z.number().int().positive(),
        contributorName: ownerNameSchema,
        description: z.string().trim().min(3).max(1000),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<ContributionRecord> => {
    await ensureSchema();
    const result = await getPool().query(
      `INSERT INTO meydan_contributions (idea_id, contributor_name, description)
       VALUES ($1,$2,$3) RETURNING *`,
      [data.ideaId, data.contributorName, data.description],
    );
    return rowToContribution(result.rows[0]);
  });

/** Bir fikre gelen tüm katkıları listeler (fikir sahibinin onay panelinde kullanılır). */
export const listContributions = createServerFn({ method: "GET" })
  .validator((ideaId: unknown) => z.number().int().positive().parse(ideaId))
  .handler(async ({ data: ideaId }): Promise<ContributionRecord[]> => {
    await ensureSchema();
    const result = await getPool().query(
      `SELECT * FROM meydan_contributions WHERE idea_id = $1 ORDER BY created_at DESC`,
      [ideaId],
    );
    return result.rows.map(rowToContribution);
  });

/**
 * Fikir sahibi bir katkıyı onaylar/reddeder. Onaylanırsa katkı verene KP
 * kazandırılır ve fikir bir sonraki bölgeye ilerler — raporun "fikrin
 * bölgeden bölgeye ilerleyişi" akışı burada gerçek bir veri değişikliğine
 * dönüşür (yalnızca görsel bir yönlendirme olmaktan çıkar).
 */
export const decideContribution = createServerFn({ method: "POST" })
  .validator(
    (input: {
      contributionId: number;
      ownerName: string;
      decision: "approved" | "rejected";
      kpAwarded?: number;
    }) =>
      z
        .object({
          contributionId: z.number().int().positive(),
          ownerName: ownerNameSchema,
          decision: z.enum(["approved", "rejected"]),
          kpAwarded: z.number().int().min(1).max(100).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureSchema();
    const pool = getPool();
    const check = await pool.query(
      `SELECT i.id AS idea_id, i.owner_name, i.region, c.status
       FROM meydan_contributions c
       JOIN meydan_ideas i ON i.id = c.idea_id
       WHERE c.id = $1`,
      [data.contributionId],
    );
    if (check.rows.length === 0) throw new Error("Katkı bulunamadı.");
    const row = check.rows[0];
    if (row["owner_name"] !== data.ownerName) {
      throw new Error("Sadece fikrin sahibi bu katkıyı onaylayabilir/reddedebilir.");
    }
    if (row["status"] !== "pending") {
      throw new Error("Bu katkı zaten karara bağlanmış.");
    }

    const kp = data.decision === "approved" ? (data.kpAwarded ?? 10) : null;
    await pool.query(
      `UPDATE meydan_contributions SET status = $1, kp_awarded = $2, decided_at = now() WHERE id = $3`,
      [data.decision, kp, data.contributionId],
    );

    if (data.decision === "approved") {
      const advanced = nextRegion(row["region"] as RegionName);
      await pool.query(`UPDATE meydan_ideas SET region = $1 WHERE id = $2`, [
        advanced,
        row["idea_id"],
      ]);
    }

    return { ok: true };
  });

export interface LeaderboardEntry {
  contributorName: string;
  totalKp: number;
  approvedCount: number;
}

/** Başarı bölgesi için: onaylanan katkılara göre toplam KP sıralaması. */
export const getLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardEntry[]> => {
    await ensureSchema();
    const result = await getPool().query(`
      SELECT contributor_name, SUM(kp_awarded)::int AS total_kp, COUNT(*)::int AS approved_count
      FROM meydan_contributions
      WHERE status = 'approved'
      GROUP BY contributor_name
      ORDER BY total_kp DESC
      LIMIT 20
    `);
    return result.rows.map((r: Record<string, unknown>) => ({
      contributorName: String(r["contributor_name"]),
      totalKp: Number(r["total_kp"]),
      approvedCount: Number(r["approved_count"]),
    }));
  },
);
