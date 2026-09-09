import { useState } from "react";
import { Lightbulb, X, Plus, ArrowRight } from "lucide-react";

export interface AtolyeIdea {
  id: string;
  title: string;
  region: string;
}

export interface AtolyeKapisiProps {
  /** Panel açık mı */
  open: boolean;
  /** Panel kapatma isteği */
  onClose: () => void;
  /** Açık fikirler listesi — dışarıdan verilir */
  ideas: AtolyeIdea[];
  /** Bir fikre tıklanınca çağrılır */
  onSelectIdea: (ideaId: string) => void;
  /** Yeni fikir gönderilince çağrılır (opsiyonel) */
  onSubmit?: ((title: string) => void) | undefined;
}

/** Üretim Atölyesi kapısının açtığı "Açık Fikirler" paneli */
export function AtolyeKapisi({ open, onClose, ideas, onSelectIdea, onSubmit }: AtolyeKapisiProps) {
  const [draft, setDraft] = useState("");
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-primary/40 bg-card/95 text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Üretim Atölyesi
            </p>
            <h2 className="text-lg font-semibold leading-tight">Açık Fikirler</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Bir fikir seç, o fikrin inşa odasına geç.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-full bg-accent/60 p-1.5 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="max-h-[45vh] space-y-2 overflow-y-auto px-5 py-4">
          {ideas.length === 0 && (
            <li className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
              Şu an açık fikir yok.
            </li>
          )}
          {ideas.map((idea) => (
            <li key={idea.id}>
              <button
                onClick={() => onSelectIdea(idea.id)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/60 px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Lightbulb className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{idea.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{idea.region}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>

        {onSubmit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const title = draft.trim();
              if (!title) return;
              onSubmit(title);
              setDraft("");
            }}
            className="flex items-center gap-2 border-t border-border/50 px-5 py-4"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Yeni fikir başlığı"
              className="min-w-0 flex-1 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-sm outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Ekle
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
