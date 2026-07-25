interface Props {
  open: boolean;
  onToggle: () => void;
}

// Pulsante hamburger in alto a sinistra. Quando il menù è aperto si nasconde
// (la chiusura avviene con la ✕ del pannello, il backdrop o Esc).
export function MenuButton({ open, onToggle }: Props) {
  const bar = 'block w-5 h-0.5 rounded bg-white';
  return (
    <button
      aria-label="Apri il menù"
      onClick={onToggle}
      className={`fixed left-4 top-4 z-[60] flex h-[46px] w-[46px] flex-col items-center justify-center gap-[5px] rounded-xl border border-white/10 bg-[rgba(10,10,16,0.6)] backdrop-blur-md transition-[opacity,transform,background-color] duration-200 hover:border-white/25 hover:bg-[rgba(20,20,30,0.8)] ${
        open ? 'pointer-events-none -translate-x-2 opacity-0' : 'opacity-100'
      }`}
    >
      <span className={bar} />
      <span className={bar} />
      <span className={bar} />
    </button>
  );
}
