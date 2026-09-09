import { useCallback, useEffect, useState } from "react";
import { X, Check, Trash2, Trophy, Users, Flag } from "lucide-react";

import {
  listIdeas,
  proposeContribution,
  listContributions,
  decideContribution,
  getLeaderboard,
  reportIdea,
  reportContribution,
} from "@/lib/ideas-db";
import type { IdeaRecord, ContributionRecord, LeaderboardEntry } from "@/lib/ideas-db";
import { useMeydanRealtime } from "@/lib/use-meydan-realtime";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "uygunsuz", label: "Uygunsuz" },
  { value: "diger", label: "Diğer" },
] as const;

function ReportButton({
  onReport,
  reported,
}: {
  onReport: (reason: "spam" | "uygunsuz" | "diger") => Promise<void>;
  reported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (reported) {
    return <span className="text-[10px] text-muted-foreground">Bildirdin</span>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Bildir"
        className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <Flag className="h-3 w-3" />
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {REPORT_REASONS.map((r) => (
        <button
          key={r.value}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onReport(r.value);
            setBusy(false);
            setOpen(false);
          }}
          className="rounded-full border border-destructive/30 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {r.label}
        </button>
      ))}
      <button
        onClick={() => setOpen(false)}
        className="text-[10px] text-muted-foreground hover:underline"
      >
        vazgeç
      </button>
    </span>
  );
}

// Pusher yapılandırılıysa veri değişikliği <1sn içinde işaret gelir (bkz.
// use-meydan-realtime.ts); bu yalnızca o mekanizma sessizce başarısız
// olursa (ağ hatası, Pusher devre dışı) diye bir yedek/güvenlik ağıdır.
const FALLBACK_POLL_MS = 60_000;

interface IdeasBrowserProps {
  currentUser: string;
  onClose: () => void;
}

type Tab = "fikirler" | "liderlik";

export function IdeasBrowser({ currentUser, onClose }: IdeasBrowserProps) {
  const [tab, setTab] = useState<Tab>("fikirler");
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [ideaRows, board] = await Promise.all([listIdeas(), getLeaderboard()]);
      setIdeas(ideaRows);
      setLeaderboard(board);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Fikirler yüklenemedi. Katkı/KP defteri için bir veritabanı bağlantısı gerekiyor.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const live = useMeydanRealtime(refresh);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), FALLBACK_POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/40 bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Meydan
              {live && (
                <span
                  className="flex items-center gap-1 normal-case tracking-normal text-emerald-500"
                  title="Gerçek zamanlı bağlantı aktif"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> canlı
                </span>
              )}
            </p>
            <p className="text-sm font-semibold leading-tight">Fikirler &amp; Katkılar</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Sen: {currentUser}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border/40 px-3 pt-2">
          <TabButton active={tab === "fikirler"} onClick={() => setTab("fikirler")} icon={Users}>
            Fikirler
          </TabButton>
          <TabButton active={tab === "liderlik"} onClick={() => setTab("liderlik")} icon={Trophy}>
            Liderlik Tablosu
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {loading ? (
            <p className="text-xs text-muted-foreground">Yükleniyor…</p>
          ) : tab === "fikirler" ? (
            <IdeasList ideas={ideas} currentUser={currentUser} onChanged={refresh} />
          ) : (
            <LeaderboardList entries={leaderboard} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-primary text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Henüz onaylanmış katkı yok. İlk katkıyı sunup onaylanmasını sağlayan burada görünecek.
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li
          key={e.contributorName}
          className="flex items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              {i + 1}
            </span>
            {e.contributorName}
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-card-foreground">{e.totalKp} KP</span> ·{" "}
            {e.approvedCount} katkı
          </span>
        </li>
      ))}
    </ol>
  );
}

function IdeasList({
  ideas,
  currentUser,
  onChanged,
}: {
  ideas: IdeaRecord[];
  currentUser: string;
  onChanged: () => void;
}) {
  if (ideas.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Henüz paylaşılan bir fikir yok. "Fikrini Paylaş" ile ilk fikri sen ekleyebilirsin.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {ideas.map((idea) => (
        <IdeaRow key={idea.id} idea={idea} currentUser={currentUser} onChanged={onChanged} />
      ))}
    </ul>
  );
}

function IdeaRow({
  idea,
  currentUser,
  onChanged,
}: {
  idea: IdeaRecord;
  currentUser: string;
  onChanged: () => void;
}) {
  const isOwner = idea.ownerName === currentUser;
  const [showContribute, setShowContribute] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pending, setPending] = useState<ContributionRecord[] | null>(null);
  const [ideaReported, setIdeaReported] = useState(false);
  const [reportedContribs, setReportedContribs] = useState<Set<number>>(new Set());

  const submitContribution = useCallback(async () => {
    const trimmed = description.trim();
    if (trimmed.length < 3) {
      setRowError("Katkı açıklamasını biraz daha uzun yaz.");
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      await proposeContribution({
        data: { ideaId: idea.id, contributorName: currentUser, description: trimmed },
      });
      setDescription("");
      setShowContribute(false);
      onChanged();
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Katkı gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }, [description, idea.id, currentUser, onChanged]);

  const loadPending = useCallback(async () => {
    setBusy(true);
    setRowError(null);
    try {
      const all = await listContributions({ data: idea.id });
      setPending(all.filter((c) => c.status === "pending"));
      setShowPending(true);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Katkılar yüklenemedi.");
    } finally {
      setBusy(false);
    }
  }, [idea.id]);

  const decide = useCallback(
    async (contributionId: number, decision: "approved" | "rejected") => {
      setBusy(true);
      setRowError(null);
      try {
        await decideContribution({
          data: { contributionId, ownerName: currentUser, decision, kpAwarded: idea.suggestedKp },
        });
        setPending((prev) => prev?.filter((c) => c.id !== contributionId) ?? null);
        onChanged();
      } catch (err) {
        setRowError(err instanceof Error ? err.message : "Karar kaydedilemedi.");
      } finally {
        setBusy(false);
      }
    },
    [currentUser, idea.suggestedKp, onChanged],
  );

  return (
    <li className="rounded-xl border border-border/40 bg-background/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: idea.color }} />
          <div>
            <p className="text-sm font-semibold leading-tight text-card-foreground">{idea.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Bölge: <span className="font-medium text-card-foreground">{idea.region}</span> ·
              Sahibi: {idea.ownerName} {isOwner && "(sen)"}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{idea.suggestedKp} KP</span>
          {!isOwner && (
            <ReportButton
              reported={ideaReported}
              onReport={async (reason) => {
                try {
                  await reportIdea({
                    data: { ideaId: idea.id, reporterName: currentUser, reason },
                  });
                  setIdeaReported(true);
                  onChanged();
                } catch {
                  // sessizce yut: içerik zaten gizlenmiş/kaldırılmış olabilir
                }
              }}
            />
          )}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{idea.approvedContributions} onaylı katkı</span>
        {idea.pendingContributions > 0 && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
            {idea.pendingContributions} bekleyen
          </span>
        )}
      </div>

      {rowError && <p className="mt-2 text-[11px] text-destructive">{rowError}</p>}

      {isOwner ? (
        <div className="mt-2">
          <button
            onClick={() => (showPending ? setShowPending(false) : void loadPending())}
            disabled={busy}
            className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
          >
            {showPending ? "Bekleyen katkıları gizle" : "Bekleyen katkıları gör"}
          </button>
          {showPending && (
            <ul className="mt-2 space-y-2">
              {(pending ?? []).length === 0 && (
                <li className="text-[11px] text-muted-foreground">Bekleyen katkı yok.</li>
              )}
              {(pending ?? []).map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-border/30 bg-card/60 px-2.5 py-2"
                >
                  <div>
                    <p className="text-[11px] font-medium text-card-foreground">
                      {c.contributorName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{c.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ReportButton
                      reported={reportedContribs.has(c.id)}
                      onReport={async (reason) => {
                        try {
                          await reportContribution({
                            data: { contributionId: c.id, reporterName: currentUser, reason },
                          });
                          setReportedContribs((prev) => new Set(prev).add(c.id));
                        } catch {
                          // sessizce yut
                        }
                      }}
                    />
                    <button
                      onClick={() => void decide(c.id, "approved")}
                      disabled={busy}
                      aria-label="Onayla"
                      className="rounded-full bg-primary/15 p-1 text-primary hover:bg-primary/25 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void decide(c.id, "rejected")}
                      disabled={busy}
                      aria-label="Reddet"
                      className="rounded-full bg-destructive/15 p-1 text-destructive hover:bg-destructive/25 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-2">
          {showContribute ? (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ne katkı sunuyorsun? (tasarım, kod, geri bildirim…)"
                rows={2}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-border/40 bg-card/60 p-2 text-xs text-foreground outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitContribution}
                  disabled={busy || description.trim().length < 3}
                  className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Gönder
                </button>
                <button
                  onClick={() => setShowContribute(false)}
                  className="rounded-lg border border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowContribute(true)}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Katkı Sun
            </button>
          )}
        </div>
      )}
    </li>
  );
}
