import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { PHASES, TYPES } from '../data/mcu';
import { resolvePoster } from '../lib/posters';
import { formatDate, yearOf } from '../lib/format';
import type { McuItem, ViewMode } from '../types';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  item: McuItem;
  index: number;
  view: ViewMode;
  posterVersion: number;
  onOpen: (item: McuItem) => void;
}

export function Card({ item, index, view, posterVersion, onOpen }: Props) {
  const above = index % 2 === 0;
  const color = PHASES[item.phase].color;
  const cardRef = useRef<HTMLDivElement>(null);
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resolvePoster(item).then((url) => {
      if (alive) setPoster(url);
    });
    return () => {
      alive = false;
    };
  }, [item, posterVersion]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (REDUCED || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cardRef.current.style.setProperty('--tilt-y', (px * 16).toFixed(2) + 'deg');
    cardRef.current.style.setProperty('--tilt-x', (-py * 16).toFixed(2) + 'deg');
  };
  const onLeave = () => {
    cardRef.current?.style.setProperty('--tilt-x', '0deg');
    cardRef.current?.style.setProperty('--tilt-y', '0deg');
  };

  const t = TYPES[item.type];

  return (
    <article
      className={`item ${above ? 'item--up' : 'item--down'}`}
      data-id={item.id}
      data-phase={item.phase}
      tabIndex={0}
      role="button"
      aria-label={`${item.title} (${yearOf(item.release)})`}
      style={{ ['--phase']: color } as CSSProperties}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item);
        }
      }}
    >
      {!above && <div className="item__node" />}

      <div className="card-wrap" onPointerMove={onMove} onPointerLeave={onLeave} onClick={() => onOpen(item)}>
        <div className="card" ref={cardRef}>
          <div className={`card__poster${poster ? ' has-img' : ''}`}>
            {poster && <img src={poster} alt={item.title} className="card__img" />}
            {!poster && (
              <div className="card__fallback">
                <span className="card__fallback-type">{t.label}</span>
                <span className="card__fallback-title">{item.title}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-[3px] px-2.5 pb-2.5 pt-2">
            <span className="text-[9px] font-bold uppercase tracking-[1px] text-muted">
              {t.icon} {t.label}
            </span>
            <h3 className="card__title-clamp text-[12px] font-bold leading-[1.18] text-white">
              {item.title}
            </h3>
            {view === 'release' && (
              <span className="text-[10.5px] font-semibold" style={{ color: 'var(--phase)' }}>
                {formatDate(item.release)}
              </span>
            )}
          </div>
        </div>
      </div>

      {above && <div className="item__node" />}
    </article>
  );
}
