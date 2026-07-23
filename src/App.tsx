import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ITEMS } from './data/mcu';
import { buildTimeline } from './lib/grouping';
import { useAudio } from './hooks/useAudio';
import { Starfield } from './components/Starfield';
import { MenuButton } from './components/MenuButton';
import { Drawer } from './components/Drawer';
import { Timeline } from './components/Timeline';
import { Minimap } from './components/Minimap';
import { Modal, type ModalContent } from './components/Modal';
import type { MediaType, McuItem, ViewMode } from './types';

const ALL_TYPES: MediaType[] = ['film', 'series', 'animation', 'special'];

export default function App() {
  const [view, setView] = useState<ViewMode>('release');
  const [types, setTypes] = useState<Set<MediaType>>(() => new Set(ALL_TYPES));
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalContent | null>(null);
  const [posterVersion, setPosterVersion] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const audio = useAudio();

  const visibleItems = useMemo(() => {
    const q = query.toLowerCase();
    const list = ITEMS.filter((it) => {
      if (!types.has(it.type)) return false;
      if (q && !it.title.toLowerCase().includes(q) && !(it.overview || '').toLowerCase().includes(q))
        return false;
      return true;
    });
    list.sort((a, b) =>
      view === 'release'
        ? a.release.localeCompare(b.release)
        : a.chrono - b.chrono || a.release.localeCompare(b.release),
    );
    return list;
  }, [types, query, view]);

  const { rows, groups } = useMemo(() => buildTimeline(visibleItems, view), [visibleItems, view]);

  const toggleType = (t: MediaType) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      if (next.size === 0) next.add(t); // almeno un tipo attivo
      return next;
    });

  const openItem = (item: McuItem) => setModal({ kind: 'item', item });

  const onAudioClick = () => {
    if (!audio.ready) setModal({ kind: 'audioInfo' });
    else audio.toggle();
  };

  // ── Dimensiona i poster in base all'altezza reale del contenitore ──────────
  useLayoutEffect(() => {
    const compute = () => {
      const sc = scrollerRef.current;
      if (!sc) return;
      const h = sc.clientHeight;
      if (!h) return;
      const META = 80;
      const NODE_HALF = 8;
      const SAFE = 22;
      const gap = Math.round(Math.min(30, Math.max(12, h * 0.028)));
      let poster = Math.floor(h / 2 - NODE_HALF - gap - META - SAFE);
      poster = Math.max(120, Math.min(240, poster));
      const r = document.documentElement.style;
      r.setProperty('--poster-h', poster + 'px');
      r.setProperty('--gap', gap + 'px');
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [view, visibleItems.length]);

  // ── Scroll orizzontale: rotellina + drag ───────────────────────────────────
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        sc.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    let down = false, startX = 0, startLeft = 0, moved = false;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, input, a')) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = sc.scrollLeft;
      sc.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      sc.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      down = false;
      sc.classList.remove('is-dragging');
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    sc.addEventListener('wheel', onWheel, { passive: false });
    sc.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    sc.addEventListener('click', onClickCapture, true);
    return () => {
      sc.removeEventListener('wheel', onWheel);
      sc.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      sc.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  // ── Tastiera globale ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null);
        setMenuOpen(false);
      }
      const sc = scrollerRef.current;
      if (!sc) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') sc.scrollLeft += 320;
      if (e.key === 'ArrowLeft') sc.scrollLeft -= 320;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Starfield />
      <MenuButton open={menuOpen} onToggle={() => setMenuOpen((o) => !o)} />
      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        onView={setView}
        types={types}
        onToggleType={toggleType}
        query={query}
        onQuery={setQuery}
        audio={audio}
        onAudioClick={onAudioClick}
        onOpenSettings={() => setModal({ kind: 'settings' })}
      />

      <main className="flex h-full flex-1 flex-col">
        <div ref={scrollerRef} id="scroller" className="scroller">
          <div className="track">
            <Timeline rows={rows} view={view} posterVersion={posterVersion} onOpen={openItem} />
          </div>
        </div>

        <Minimap groups={groups} view={view} scrollerRef={scrollerRef} />

        {view === 'chrono' && (
          <div className="flex flex-none items-center gap-2 border-t border-white/10 bg-black/30 px-5.5 py-2 text-[12px] text-muted">
            <span className="text-red">ⓘ</span> Ordinamento interno alla storia — ricostruzione
            curata, non ufficiale.
          </div>
        )}
      </main>

      <Modal
        content={modal}
        onClose={() => setModal(null)}
        onPostersChanged={() => setPosterVersion((v) => v + 1)}
      />
    </>
  );
}
