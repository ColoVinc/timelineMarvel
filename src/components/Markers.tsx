import { lazy, Suspense, type CSSProperties } from 'react';
import { STONES } from '../data/stones';
import type { PhaseInfo, SagaInfo } from '../types';

// Three.js è pesante: carichiamo la gemma 3D in un chunk separato, così la
// timeline appare subito e le gemme compaiono appena il chunk è pronto.
const InfinityStone = lazy(() =>
  import('./InfinityStone').then((m) => ({ default: m.InfinityStone })),
);

export function SagaMarker({ saga }: { saga: SagaInfo }) {
  return (
    <div className="saga-marker">
      <div className="saga-marker__inner">
        <span className="saga-marker__label">{saga.name}</span>
      </div>
    </div>
  );
}

export function PhaseMarker({ phase }: { phase: PhaseInfo }) {
  const stone = STONES[phase.n];
  return (
    <div className="phase-marker" style={{ ['--phase']: phase.color } as CSSProperties}>
      <div className="phase-marker__num">0{phase.n}</div>
      <div className="phase-marker__name">{phase.name.toUpperCase()}</div>
      {stone && (
        <Suspense fallback={<div className="infinity-stone" style={{ ['--stone']: stone.color } as CSSProperties} />}>
          <InfinityStone stone={stone} />
        </Suspense>
      )}
      <div className="phase-marker__line" />
    </div>
  );
}

export function EraMarker({ era }: { era: string }) {
  return (
    <div className="era-marker">
      <div className="era-marker__dot" />
      <div className="era-marker__label">{era}</div>
    </div>
  );
}
