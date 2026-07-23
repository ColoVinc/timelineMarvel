import type { CSSProperties } from 'react';
import type { PhaseInfo, SagaInfo } from '../types';

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
  return (
    <div className="phase-marker" style={{ ['--phase']: phase.color } as CSSProperties}>
      <div className="phase-marker__num">0{phase.n}</div>
      <div className="phase-marker__name">{phase.name.toUpperCase()}</div>
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
