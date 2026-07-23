import { useEffect, useRef } from 'react';
import { initStarfield } from '../lib/starfield';

// Canvas dello sfondo cosmico. Tutta la logica (WebGL/2D) vive in lib/starfield.
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return initStarfield(ref.current);
  }, []);
  return <canvas id="starfield" ref={ref} />;
}
