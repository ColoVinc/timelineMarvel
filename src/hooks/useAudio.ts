import { useEffect, useRef, useState } from 'react';

const AUDIO_STORE = 'mcu_audio';
const VOLUME_STORE = 'mcu_volume';

export interface AudioControls {
  ready: boolean;
  playing: boolean;
  volume: number; // 0..100
  toggle: () => void;
  setVolume: (v: number) => void;
}

// Gestisce la theme song di sottofondo: file /theme.mp3 (non incluso, copyright).
// Attiva di default; parte al primo gesto perché i browser bloccano l'autoplay.
export function useAudio(): AudioControls {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVol] = useState(() => {
    const s = parseInt(localStorage.getItem(VOLUME_STORE) ?? '35', 10);
    return Number.isNaN(s) ? 35 : Math.min(100, Math.max(0, s));
  });

  useEffect(() => {
    const audio = new Audio('/theme.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volume / 100;
    audioRef.current = audio;

    const onErr = () => setReady(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('error', onErr);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    let stopGestures = () => {};
    if ((localStorage.getItem(AUDIO_STORE) ?? 'on') === 'on') {
      const GESTURES = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
      const stop = () => GESTURES.forEach((e) => window.removeEventListener(e, tryPlay));
      const tryPlay = () => {
        audio.play().then(stop, () => {});
      };
      tryPlay();
      GESTURES.forEach((e) => window.addEventListener(e, tryPlay, { passive: true }));
      stopGestures = stop;
    }

    return () => {
      audio.pause();
      audio.removeEventListener('error', onErr);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      stopGestures();
      audioRef.current = null;
    };
    // Mount una sola volta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => localStorage.setItem(AUDIO_STORE, 'on'), () => {});
    } else {
      audio.pause();
      localStorage.setItem(AUDIO_STORE, 'off');
    }
  };

  const setVolume = (v: number) => {
    setVol(v);
    if (audioRef.current) audioRef.current.volume = v / 100;
    localStorage.setItem(VOLUME_STORE, String(v));
  };

  return { ready, playing, volume, toggle, setVolume };
}
