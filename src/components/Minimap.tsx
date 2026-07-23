import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { Group, ViewMode } from '../types';

interface Props {
  groups: Group[];
  view: ViewMode;
  scrollerRef: RefObject<HTMLDivElement>;
}

export function Minimap({ groups, view, scrollerRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const scrollToItem = (id: string) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(`.item[data-id="${id}"]`);
    if (!scroller || !target) return;
    scroller.scrollTo({ left: Math.max(0, target.offsetLeft - 90), behavior: 'smooth' });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    const root = rootRef.current;
    const handle = handleRef.current;
    if (!scroller || !root || !handle) return;

    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const frac = max > 0 ? scroller.scrollLeft / max : 0;
      const visible = scroller.clientWidth / scroller.scrollWidth;
      const w = root.clientWidth - 44; // meno il padding orizzontale (22px * 2)
      const hw = Math.max(28, Math.min(w, visible * w));
      handle.style.width = hw + 'px';
      handle.style.transform = `translateX(${frac * (w - hw)}px)`;

      // Segmento attivo = ultima epoca il cui inizio ha superato la linea di
      // messa a fuoco vicina al bordo sinistro (avanza una alla volta).
      const segs = Array.from(root.querySelectorAll<HTMLElement>('.minimap__seg'));
      const starts = segs.map((seg) => {
        const target = scroller.querySelector<HTMLElement>(`.item[data-id="${seg.dataset.target}"]`);
        return (target ? target.offsetLeft : 0) - 80;
      });
      const focus = scroller.scrollLeft + 120;
      let activeIdx = 0;
      for (let i = 0; i < starts.length; i++) {
        if (starts[i] <= focus) activeIdx = i;
        else break;
      }
      const activeId = segs[activeIdx]?.dataset.target;
      segs.forEach((seg) => seg.classList.toggle('is-active', seg.dataset.target === activeId));
    };

    const raf = requestAnimationFrame(update);
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [groups, view, scrollerRef]);

  return (
    <div ref={rootRef} className={`minimap${view === 'chrono' ? ' is-chrono' : ''}`}>
      <div ref={handleRef} className="minimap__handle" />
      {groups.map((g) => (
        <button
          key={g.firstId}
          className="minimap__seg"
          data-target={g.firstId}
          title={`${g.full} — ${g.count} titoli`}
          onClick={() => scrollToItem(g.firstId)}
          style={
            {
              ['--phase']: g.color,
              flexGrow: view === 'release' ? g.count : undefined,
            } as CSSProperties
          }
        >
          <span className="minimap__seg-label">{g.label}</span>
        </button>
      ))}
    </div>
  );
}
