// Le sei Gemme dell'Infinito, una per fase, nell'ordine dell'immagine di
// riferimento (Spazio, Mente, Realtà, Potere, Tempo, Anima).
//
//  color      colore principale del cristallo
//  core       colore del nucleo luminoso interno
//  seed       rende deterministica la forma irregolare
//  amp        irregolarità della superficie (0 = liscia, alto = molto rocciosa)
//  roughness  ruvidità del materiale (basso = lucido, come l'Aether rosso)
//  metalness  metallicità del materiale
export interface Stone {
  name: string;
  color: string;
  core: string;
  seed: number;
  amp: number;
  roughness: number;
  metalness: number;
}

export const STONES: Record<number, Stone> = {
  1: { name: 'Gemma dello Spazio', color: '#2f6bff', core: '#d0e6ff', seed: 11, amp: 0.26, roughness: 0.45, metalness: 0.35 },
  2: { name: 'Gemma della Mente', color: '#ffcf1f', core: '#fff3b8', seed: 23, amp: 0.3, roughness: 0.32, metalness: 0.5 },
  3: { name: 'Gemma della Realtà', color: '#ff2436', core: '#ff9a9a', seed: 37, amp: 0.16, roughness: 0.1, metalness: 0.15 },
  4: { name: 'Gemma del Potere', color: '#a12bff', core: '#ff67e0', seed: 41, amp: 0.28, roughness: 0.4, metalness: 0.4 },
  5: { name: 'Gemma del Tempo', color: '#14c94a', core: '#ccffdd', seed: 53, amp: 0.24, roughness: 0.24, metalness: 0.35 },
  6: { name: "Gemma dell'Anima", color: '#ff6a1a', core: '#ffcf9a', seed: 67, amp: 0.27, roughness: 0.4, metalness: 0.3 },
};
