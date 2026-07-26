import { lazy, Suspense, useRef, type CSSProperties } from 'react';
import { STONES } from '../data/stones';
import { useInView } from '../hooks/useInView';
import type { PhaseInfo, SagaInfo } from '../types';

// Three.js è pesante: carichiamo la gemma 3D in un chunk separato, scaricato
// solo quando la prima gemma sta per entrare in scena.
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
  const stoneRef = useRef<HTMLDivElement>(null);
  // Il canvas 3D esiste solo mentre la gemma è in vista: alleggerisce il primo
  // caricamento e tiene basso il numero di contesti WebGL attivi insieme.
  const stoneInView = useInView(stoneRef);

  return (
    <div className="phase-marker" style={{ ['--phase']: phase.color } as CSSProperties}>
      <div className="phase-marker__num">0{phase.n}</div>
      <div className="phase-marker__name">{phase.name.toUpperCase()}</div>
      {stone && (
        <div
          ref={stoneRef}
          className="infinity-stone"
          style={{ ['--stone']: stone.color, ['--stone-core']: stone.core } as CSSProperties}
          title={stone.name}
          aria-hidden="true"
        >
          {stoneInView && (
            <Suspense fallback={null}>
              <InfinityStone stone={stone} />
            </Suspense>
          )}
        </div>
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
