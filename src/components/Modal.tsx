import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { PHASES, SAGAS, TYPES } from '../data/mcu';
import { resolvePoster, getApiKey, setApiKey, clearPosterCache } from '../lib/posters';
import { formatDate } from '../lib/format';
import type { McuItem } from '../types';

export type ModalContent =
  | { kind: 'item'; item: McuItem }
  | { kind: 'settings' }
  | { kind: 'audioInfo' };

interface Props {
  content: ModalContent | null;
  onClose: () => void;
  onPostersChanged: () => void;
}

export function Modal({ content, onClose, onPostersChanged }: Props) {
  const [active, setActive] = useState<ModalContent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (content) {
      setActive(content);
      const r = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setOpen(false);
    const t = setTimeout(() => setActive(null), 240);
    return () => clearTimeout(t);
  }, [content]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[rgba(4,4,8,0.78)] backdrop-blur-md transition-opacity duration-[220ms] ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative max-h-[88vh] w-[min(760px,100%)] overflow-auto rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,var(--color-bg2),var(--color-bg0))] shadow-[0_40px_120px_rgba(0,0,0,0.7)] transition-[transform,opacity] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
        }`}
      >
        <button
          aria-label="Chiudi"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-[2] flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/10 bg-black/50 text-[14px] text-white hover:bg-red"
        >
          ✕
        </button>

        {active.kind === 'item' && <ItemDetail item={active.item} />}
        {active.kind === 'settings' && (
          <SettingsPanel onClose={onClose} onChanged={onPostersChanged} />
        )}
        {active.kind === 'audioInfo' && <AudioInfo />}
      </div>
    </div>
  );
}

function ItemDetail({ item }: { item: McuItem }) {
  const phase = PHASES[item.phase];
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolvePoster(item).then((u) => alive && setPoster(u));
    return () => {
      alive = false;
    };
  }, [item]);

  return (
    <div className="flex flex-col sm:flex-row" style={{ ['--phase']: phase.color } as CSSProperties}>
      <div className="flex min-h-[200px] shrink-0 items-center justify-center bg-[linear-gradient(160deg,var(--phase),#0a0a10)] p-5 sm:min-h-[340px] sm:basis-[240px]">
        {poster ? (
          <img src={poster} alt={item.title} className="w-full rounded-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]" />
        ) : (
          <span className="text-center text-[22px] font-extrabold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
            {item.title}
          </span>
        )}
      </div>
      <div className="flex-1 p-7">
        <div className="mb-3.5 flex flex-wrap gap-2">
          <Tag phase>{phase.name}</Tag>
          <Tag>{SAGAS[item.saga].name}</Tag>
          <Tag>
            {TYPES[item.type].icon} {TYPES[item.type].label}
          </Tag>
        </div>
        <h2 className="mb-[18px] text-[30px] font-extrabold leading-[1.05]">{item.title}</h2>
        <div className="mb-5 flex gap-7 border-b border-white/10 pb-[18px]">
          <Fact label="Uscita" value={formatDate(item.release)} />
          <Fact label="Epoca nella storia" value={item.era} />
        </div>
        <p className="text-[15px] leading-[1.6] text-[#d8d8e2]">{item.overview || '—'}</p>
      </div>
    </div>
  );
}

function Tag({ children, phase }: { children: ReactNode; phase?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-[5px] text-[11px] font-bold tracking-[0.5px] ${
        phase ? 'bg-[var(--phase)] text-white' : 'border border-white/10 bg-white/8 text-ink'
      }`}
    >
      {children}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-[3px] block text-[11px] uppercase tracking-[1px] text-muted">{label}</span>
      <strong className="text-[15px]">{value}</strong>
    </div>
  );
}

function SettingsPanel({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const [key, setKey] = useState(getApiKey());
  const save = () => {
    setApiKey(key);
    clearPosterCache();
    onChanged();
    onClose();
  };
  const clear = () => {
    setApiKey('');
    clearPosterCache();
    setKey('');
    onChanged();
    onClose();
  };
  return (
    <div className="max-w-[560px] p-[34px]">
      <h2 className="mb-3 text-[22px] font-bold">Poster reali da TMDB</h2>
      <p className="text-[14px] leading-[1.55] text-muted">
        Per mostrare i poster ufficiali serve una API key gratuita di{' '}
        <strong>The Movie Database</strong>. Registrati su themoviedb.org → Impostazioni → API, e
        incolla qui la chiave (v3 auth).
      </p>
      <label className="mb-1.5 mt-4 block text-[12px] uppercase tracking-[1px] text-muted">
        API key TMDB
      </label>
      <input
        type="text"
        value={key}
        placeholder="es. 1a2b3c4d…"
        onChange={(e) => setKey(e.target.value)}
        className="w-full rounded-[10px] border border-white/10 bg-white/5 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-red"
      />
      <div className="mt-4 flex gap-2.5">
        <button
          onClick={save}
          className="rounded-[10px] border border-transparent bg-[linear-gradient(180deg,var(--color-redb),var(--color-red))] px-[18px] py-[11px] text-[14px] font-semibold text-white hover:brightness-110"
        >
          Salva e ricarica poster
        </button>
        <button
          onClick={clear}
          className="rounded-[10px] border border-white/10 bg-white/[0.06] px-[18px] py-[11px] text-[14px] font-semibold text-ink hover:bg-white/10"
        >
          Rimuovi
        </button>
      </div>
      <p className="mt-3.5 text-[12px] text-muted">
        Senza chiave l'app funziona comunque con card stilizzate.
      </p>
    </div>
  );
}

function AudioInfo() {
  return (
    <div className="max-w-[560px] p-[34px]">
      <h2 className="mb-3 text-[22px] font-bold">Musica di sottofondo</h2>
      <p className="text-[14px] leading-[1.55] text-muted">
        La theme degli Avengers è protetta da copyright, quindi il file non è incluso nel progetto.
        Per abilitarla, aggiungi un tuo file audio:
      </p>
      <p className="mt-3 text-[14px] leading-[1.55] text-muted">
        <strong>1.</strong> Prendi il tuo brano e rinominalo <code>theme.mp3</code>.
        <br />
        <strong>2.</strong> Mettilo nella cartella <code>public/</code> del progetto.
        <br />
        <strong>3.</strong> Ricarica la pagina: il pulsante 🔊 attiverà/silenzierà la musica.
      </p>
      <p className="mt-3.5 text-[12px] text-muted">
        Puoi usare qualsiasi file MP3. Il volume parte basso (di sottofondo) e la traccia va in loop.
      </p>
    </div>
  );
}
