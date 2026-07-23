// Tipi condivisi del dominio MCU.

export type MediaType = 'film' | 'series' | 'animation' | 'special';
export type SagaId = 'infinity' | 'multiverse';
export type ViewMode = 'release' | 'chrono';

export interface McuItem {
  id: string;
  title: string;
  type: MediaType;
  saga: SagaId;
  phase: number;
  release: string; // YYYY-MM-DD
  tmdbType: 'movie' | 'tv';
  year: number;
  chrono: number;
  era: string;
  query?: string;
  overview?: string;
}

export interface PhaseInfo {
  n: number;
  name: string;
  saga: SagaId;
  color: string;
}

export interface SagaInfo {
  id: SagaId;
  name: string;
  phases: number[];
}

export interface TypeInfo {
  id: MediaType;
  label: string;
  icon: string;
}

// Gruppo per la mini-mappa (una fase in "uscita", un'epoca in "cronologico").
export interface Group {
  label: string;
  full: string;
  color: string;
  count: number;
  firstId: string;
}
