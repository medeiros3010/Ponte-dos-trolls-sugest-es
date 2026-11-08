import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Music, ChevronUp, ChevronDown, Play, Pause } from 'lucide-react';

const STORAGE_KEY_VOL = 'ponte_trolls_music_vol_v1';
const STORAGE_KEY_MUTED = 'ponte_trolls_music_muted_v1';
const DEFAULT_VOLUME = 0.08; // 8%

interface AmbientMusicPlayerProps {
  audioSrc?: string;
}

export const AmbientMusicPlayer: React.FC<AmbientMusicPlayerProps> = ({
  audioSrc = '/audio/down-by-the-river.mp3',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [volume, setVolume] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VOL);
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0 && val <= 1) return val;
      }
    } catch (e) {}
    return DEFAULT_VOLUME;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MUTED);
      if (stored !== null) return stored === 'true';
    } catch (e) {}
    return false;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sync volume & mute with audio element and save in localStorage
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
    try {
      localStorage.setItem(STORAGE_KEY_VOL, volume.toString());
      localStorage.setItem(STORAGE_KEY_MUTED, isMuted ? 'true' : 'false');
    } catch (e) {}
  }, [volume, isMuted]);

  // Attempt initial autoplay on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = isMuted;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch((err) => {
          // Browser prevented autoplay
          console.log('[AmbientMusic] Autoplay blocked, waiting for user gesture', err?.name);
          setIsPlaying(false);
          setAutoplayBlocked(true);
        });
    }
  }, []);

  const handleStartMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = isMuted;
    audio.volume = volume;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        console.warn('[AmbientMusic] Play failed', err);
      });
  }, [volume, isMuted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch((err) => console.warn(err));
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
    // If unmuting while stopped, start playing
    if (!nextMuted && !isPlaying && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  return (
    <>
      {/* Hidden single global audio element */}
      <audio
        ref={audioRef}
        src={audioSrc}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Discrete Autoplay blocked banner */}
      {autoplayBlocked && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <button
            onClick={handleStartMusic}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#282D13] hover:bg-[#383F1B] text-[#F8EDD5] border border-[#6b7a35] shadow-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
            title="Clique para tocar a música ambiente de Baldur's Gate 3"
          >
            <Music className="w-4 h-4 text-[#a8d363] animate-pulse" />
            <span>Ativar música ambiente</span>
          </button>
        </div>
      )}

      {/* Persistent corner player widget */}
      {!autoplayBlocked && (
        <div
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40"
          role="region"
          aria-label="Player de Música Ambiente"
        >
          <div className="bg-[#282D13]/90 hover:bg-[#282D13] backdrop-blur-md border border-[#5d7328] text-[#F8EDD5] rounded-2xl shadow-xl transition-all duration-200 overflow-hidden">
            {/* Header row / Compact trigger */}
            <div className="flex items-center gap-1.5 p-1.5 sm:p-2">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-[#39421b] hover:bg-[#48551F] text-[#F8EDD5] flex items-center justify-center transition-colors cursor-pointer"
                title={isPlaying ? 'Pausar música' : 'Tocar música'}
                aria-label={isPlaying ? 'Pausar música' : 'Tocar música'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-[#a8d363]" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-[#F8EDD5] ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 rounded-xl hover:bg-[#39421b] text-[#F8EDD5] flex items-center justify-center transition-colors cursor-pointer"
                title={isMuted ? 'Reativar som' : 'Silenciar'}
                aria-label={isMuted ? 'Reativar som' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#e58079]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#a8d363]" />
                )}
              </button>

              {/* Title & wave indicator (collapsed preview) */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 px-1.5 py-1 text-left text-xs cursor-pointer group"
                title="Expandir controle de volume"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#F8EDD5] leading-tight">
                    Down by the River
                  </span>
                  <span className="text-[9px] text-[#A69371] leading-none">
                    BG3 • {isMuted ? 'Mudo' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#F8EDD5] transition-colors" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#F8EDD5] transition-colors" />
                )}
              </button>
            </div>

            {/* Expanded Slider Controls */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-[#3f4820] space-y-2 animate-in fade-in-50">
                <div className="flex items-center justify-between text-[10px] text-[#A69371]">
                  <span>Volume da Taverna</span>
                  <span className="font-mono font-bold text-[#F8EDD5]">
                    {isMuted ? '0% (Mudo)' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <VolumeX className="w-3 h-3 text-[#A69371]" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-28 sm:w-36 h-1.5 bg-[#404b20] rounded-lg appearance-none cursor-pointer accent-[#a8d363]"
                    aria-label="Controle de volume da música"
                  />
                  <Volume2 className="w-3 h-3 text-[#A69371]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
