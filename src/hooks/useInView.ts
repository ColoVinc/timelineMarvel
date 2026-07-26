import { useEffect, useState, type RefObject } from 'react';

// Segnala se l'elemento è (quasi) visibile. `margin` anticipa l'ingresso, così
// il contenuto pesante è già pronto quando l'utente ci arriva scorrendo.
export function useInView(ref: RefObject<Element>, margin = '400px'): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true); // browser senza supporto: mostra sempre
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: margin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);

  return inView;
}
