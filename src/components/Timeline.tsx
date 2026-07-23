import { Card } from './Card';
import { SagaMarker, PhaseMarker, EraMarker } from './Markers';
import type { Row } from '../lib/grouping';
import type { McuItem, ViewMode } from '../types';

interface Props {
  rows: Row[];
  view: ViewMode;
  posterVersion: number;
  onOpen: (item: McuItem) => void;
}

export function Timeline({ rows, view, posterVersion, onOpen }: Props) {
  if (rows.length === 0) {
    return <div className="m-auto text-[15px] text-muted">Nessun titolo corrisponde ai filtri.</div>;
  }

  return (
    <>
      <div className="spine" />
      {rows.map((row) => {
        switch (row.kind) {
          case 'saga':
            return <SagaMarker key={row.key} saga={row.saga} />;
          case 'phase':
            return <PhaseMarker key={row.key} phase={row.phase} />;
          case 'era':
            return <EraMarker key={row.key} era={row.era} />;
          case 'card':
            return (
              <Card
                key={row.key}
                item={row.item}
                index={row.index}
                view={view}
                posterVersion={posterVersion}
                onOpen={onOpen}
              />
            );
        }
      })}
    </>
  );
}
