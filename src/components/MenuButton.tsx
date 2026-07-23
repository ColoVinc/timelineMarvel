interface Props {
  open: boolean;
  onToggle: () => void;
}

// Pulsante hamburger che si trasforma in "✕" quando il menù è aperto.
export function MenuButton({ open, onToggle }: Props) {
  const bar = 'block w-5 h-0.5 rounded bg-white transition-all duration-200';
  return (
    <button
      aria-label={open ? 'Chiudi il menù' : 'Apri il menù'}
      onClick={onToggle}
      className="fixed top-4 left-4 z-[60] flex h-[46px] w-[46px] flex-col items-center justify-center gap-[5px] rounded-xl border border-white/10 bg-[rgba(10,10,16,0.6)] backdrop-blur-md transition-colors hover:border-white/25 hover:bg-[rgba(20,20,30,0.8)]"
    >
      <span className={`${bar} ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
      <span className={`${bar} ${open ? 'opacity-0' : ''}`} />
      <span className={`${bar} ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
    </button>
  );
}
