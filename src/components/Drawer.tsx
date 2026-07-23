import { useState, type ReactNode } from 'react';
import { TYPES } from '../data/mcu';
import type { MediaType, ViewMode } from '../types';
import type { AudioControls } from '../hooks/useAudio';

interface Props {
  open: boolean;
  onClose: () => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  types: Set<MediaType>;
  onToggleType: (t: MediaType) => void;
  query: string;
  onQuery: (q: string) => void;
  audio: AudioControls;
  onAudioClick: () => void;
  onOpenSettings: () => void;
}

const VIEWS: [ViewMode, string][] = [
  ['release', 'Ordine di uscita'],
  ['chrono', 'Cronologico'],
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[10px] font-bold uppercase tracking-[2px] text-muted">{label}</div>
      {children}
    </div>
  );
}

export function Drawer(props: Props) {
  const { open, onClose, view, onView, types, onToggleType, query, onQuery, audio } = props;
  const [logoError, setLogoError] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[55] bg-[rgba(2,3,8,0.5)] backdrop-blur-sm transition-[opacity,visibility] duration-[250ms] ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />

      {/* Pannello */}
      <aside
        className={`fixed inset-y-0 left-0 z-[58] flex w-[min(340px,86vw)] flex-col gap-5 overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,rgba(14,14,22,0.97),rgba(6,6,11,0.98))] px-[22px] pb-7 pt-5 shadow-[24px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Intestazione */}
        <div className="relative flex flex-col border-b border-white/10 pb-[18px] leading-none">
          {logoError ? (
            <span className="self-start rounded bg-red px-2 pb-0.5 pt-[3px] text-[26px] font-extrabold tracking-[2px] text-white">
              MARVEL
            </span>
          ) : (
            <img
              src="/marvel-logo.svg"
              alt="MARVEL"
              onError={() => setLogoError(true)}
              className="h-[34px] w-auto self-start drop-shadow-[0_2px_8px_rgba(230,36,41,0.35)]"
            />
          )}
          <span className="mt-2 text-[10px] tracking-[4px] text-muted">STUDIOS · TIMELINE</span>
          <button
            aria-label="Chiudi il menù"
            onClick={onClose}
            className="absolute -right-1.5 -top-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[13px] text-white hover:bg-red"
          >
            ✕
          </button>
        </div>

        {/* Vista */}
        <Field label="Visualizzazione">
          <div className="flex w-full rounded-full border border-white/10 bg-white/5 p-[3px]">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => onView(id)}
                className={`flex-1 rounded-full px-3.5 py-[7px] text-[13px] font-semibold transition-colors ${
                  view === id
                    ? 'bg-[linear-gradient(180deg,var(--color-redb),var(--color-red))] text-white shadow-[0_2px_12px_rgba(230,36,41,0.4)]'
                    : 'text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {/* Filtri tipo */}
        <Field label="Tipo di contenuto">
          <div className="flex flex-wrap gap-2">
            {Object.values(TYPES).map((t) => {
              const active = types.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggleType(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-[12.5px] font-semibold transition-all ${
                    active
                      ? 'border-white/50 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-muted'
                  }`}
                >
                  <span className="text-[13px]">{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Ricerca */}
        <Field label="Ricerca">
          <input
            type="search"
            value={query}
            placeholder="Cerca un titolo…"
            onChange={(e) => onQuery(e.target.value.trim())}
            className="w-full rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[13px] text-ink outline-none placeholder:text-muted focus:border-red"
          />
        </Field>

        {/* Audio + volume */}
        <Field label="Audio">
          <div className="flex w-full items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5">
            <button
              onClick={props.onAudioClick}
              title={
                !audio.ready
                  ? 'Aggiungi public/theme.mp3 per la musica'
                  : audio.playing
                    ? 'Silenzia la musica'
                    : 'Riproduci la musica'
              }
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[16px] transition-colors hover:bg-white/10 ${
                !audio.ready ? 'opacity-50' : ''
              }`}
            >
              {!audio.ready ? '🎵' : audio.playing ? '🔊' : '🔈'}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={audio.volume}
              disabled={!audio.ready}
              onChange={(e) => audio.setVolume(Number(e.target.value))}
              title="Volume"
              className="vol flex-1"
            />
          </div>
        </Field>

        {/* Impostazioni */}
        <Field label="Impostazioni">
          <div className="flex items-center gap-2.5">
            <button
              onClick={props.onOpenSettings}
              title="Impostazioni poster (TMDB)"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[16px] transition-transform duration-300 hover:rotate-90 hover:bg-white/10"
            >
              ⚙
            </button>
            <span className="text-[13px] text-ink">Poster (TMDB)</span>
          </div>
        </Field>
      </aside>
    </>
  );
}
