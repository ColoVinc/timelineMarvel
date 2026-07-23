import { PHASES, SAGAS } from '../data/mcu';
import type { Group, McuItem, PhaseInfo, SagaInfo, ViewMode } from '../types';

// Riga della timeline: un marker oppure una card.
export type Row =
  | { kind: 'saga'; key: string; saga: SagaInfo }
  | { kind: 'phase'; key: string; phase: PhaseInfo }
  | { kind: 'era'; key: string; era: string }
  | { kind: 'card'; key: string; item: McuItem; index: number };

// Costruisce la sequenza di righe (marker + card) e i gruppi per la mini-mappa,
// con un'unica passata così timeline e mini-mappa restano coerenti.
export function buildTimeline(
  items: McuItem[],
  view: ViewMode,
): { rows: Row[]; groups: Group[] } {
  const rows: Row[] = [];
  const groups: Group[] = [];
  let idx = 0;

  if (view === 'release') {
    let lastPhase: number | null = null;
    let lastSaga: string | null = null;
    for (const it of items) {
      if (it.saga !== lastSaga) {
        rows.push({ kind: 'saga', key: 'saga-' + it.id, saga: SAGAS[it.saga] });
        lastSaga = it.saga;
        lastPhase = null;
      }
      if (it.phase !== lastPhase) {
        rows.push({ kind: 'phase', key: 'phase-' + it.id, phase: PHASES[it.phase] });
        lastPhase = it.phase;
        groups.push({
          label: 'F' + it.phase,
          full: PHASES[it.phase].name,
          color: PHASES[it.phase].color,
          count: 0,
          firstId: it.id,
        });
      }
      groups[groups.length - 1].count++;
      rows.push({ kind: 'card', key: it.id, item: it, index: idx++ });
    }
  } else {
    let lastEra: string | null = null;
    for (const it of items) {
      if (it.era !== lastEra) {
        rows.push({ kind: 'era', key: 'era-' + it.id, era: it.era });
        lastEra = it.era;
        groups.push({
          label: it.era,
          full: it.era,
          color: PHASES[it.phase].color,
          count: 0,
          firstId: it.id,
        });
      }
      groups[groups.length - 1].count++;
      rows.push({ kind: 'card', key: it.id, item: it, index: idx++ });
    }
  }

  return { rows, groups };
}
