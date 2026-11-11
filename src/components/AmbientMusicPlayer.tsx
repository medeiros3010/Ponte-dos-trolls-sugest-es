import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Check,
} from 'lucide-react';

export interface Track {
  id: string;
  title: string;
  game: string;
  src: string;
}

export const PLAYLIST: Track[] = [
  {
    id: 'down-by-the-river',
    title: 'Down by the River',
    game: "Baldur's Gate 3",
    src: '/audio/down-by-the-river.mp3',
  },
  {
    id: 'song-of-balduran',
    title: 'Song of Balduran',
    game: "Baldur's Gate 3",
    src: '/audio/song-of-balduran.mp3',
  },
  {
    id: 'fields-of-ard-skellig',
    title: 'The Fields of Ard Skellig',
    game: 'The Witcher 3',
    src: '/audio/fields-of-ard-skellig.mp3',
  },
];

const STORAGE_KEY_LAST_TRACK = 'ponte_trolls_last_track_v2';
const STORAGE_KEY_VOL = 'ponte_trolls_music_vol_v1';
const STORAGE_KEY_MUTED = 'ponte_trolls_music_muted_v1';
const DEFAULT_VOLUME = 0.08; // 8%

function selectInitialTrack(): Track {
  try {
    const lastId = localStorage.getItem(STORAGE_KEY_LAST_TRACK);
    if (lastId) {
      // Sorteia entre as demais faixas disponíveis para variar a cada abertura
      const pool = PLAYLIST.filter((t) => t.id !== lastId);
      if (pool.length > 0) {
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        localStorage.setItem(STORAGE_KEY_LAST_TRACK, chosen.id);
        return chosen;
      }
    }
  } catch (e) {}

  // Primeira visita ou fallback: sorteia entre todas
  const chosen = PLAYLIST[Math.floor(Math.random() * PLAYLIST.length)];
  try {
    localStorage.setItem(STORAGE_KEY_LAST_TRACK, chosen.id);
  } catch (e) {}
  return chosen;
}

export interface AmbientMusicPlayerProps {
  isAuthenticated?: boolean;
}

export const AmbientMusicPlayer: React.FC<AmbientMusicPlayerProps> = ({ isAuthenticated = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCancelledRef = useRef<boolean>(!isAuthenticated);

  // Faixa selecionada inicialmente (não troca ao navegar entre páginas)
  const [currentTrack, setCurrentTrack] = useState<Track>(() => selectInitialTrack());

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

  // Mantém token de cancelamento sincronizado
  useEffect(() => {
    playCancelledRef.current = !isAuthenticated;
  }, [isAuthenticated]);

  // Sincroniza volume & mute com a tag de áudio e persiste no navegador
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

  // Início ou parada da reprodução: música pausada por padrão ao acessar o site
  useEffect(() => {
    const audio = audioRef.current;
    if (!isAuthenticated) {
      playCancelledRef.current = true;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setIsPlaying(false);
      setAutoplayBlocked(false);
      return;
    }

    if (!audio) return;
    playCancelledRef.current = false;
    audio.volume = volume;
    audio.muted = isMuted;
    // Música pausada por padrão: o usuário ativa manualmente pelo controle existente
  }, [isAuthenticated]);

  const handleStartMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isAuthenticated) return;

    playCancelledRef.current = false;
    audio.muted = isMuted;
    audio.volume = volume;
    audio
      .play()
      .then(() => {
        if (playCancelledRef.current) {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
          return;
        }
        setIsPlaying(true);
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        console.warn('[AmbientMusic] Play failed', err);
      });
  }, [volume, isMuted, isAuthenticated]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.muted = isMuted;
      audio.volume = volume;
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
    // Se desmutar enquanto pausado, retoma a reprodução
    if (!nextMuted && !isPlaying && audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {});
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

  // Troca de faixa garantindo instância única sem sobreposição
  const changeTrack = (newTrack: Track, forcePlay: boolean = true) => {
    if (currentTrack.id === newTrack.id) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setCurrentTrack(newTrack);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_TRACK, newTrack.id);
    } catch (e) {}

    // Aguarda o React atualizar o src do elemento audio
    setTimeout(() => {
      const currentAudio = audioRef.current;
      if (currentAudio) {
        currentAudio.volume = volume;
        currentAudio.muted = isMuted;
        if (forcePlay || isPlaying) {
          currentAudio
            .play()
            .then(() => {
              setIsPlaying(true);
              setAutoplayBlocked(false);
            })
            .catch(() => {
              setIsPlaying(false);
            });
        }
      }
    }, 40);
  };

  // Avançar para a próxima faixa da playlist
  const handleNextTrack = () => {
    const currentIndex = PLAYLIST.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % PLAYLIST.length;
    changeTrack(PLAYLIST[nextIndex], isPlaying);
  };

  // Enquanto não houver autenticação confirmada, o áudio permanece parado e o player oculto
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Elemento único de áudio HTML5 com loop */}
      <audio
        ref={audioRef}
        src={currentTrack.src}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Botão de Autoplay bloqueado pelo navegador */}
      {autoplayBlocked && (
        <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 animate-bounce">
          <button
            onClick={handleStartMusic}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#282D13] hover:bg-[#383F1B] text-[#F8EDD5] border border-[#6b7a35] shadow-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
            title="Clique para ativar a trilha sonora ambiente"
          >
            <Music className="w-4 h-4 text-[#a8d363] animate-pulse" />
            <span>Ativar música ({currentTrack.title})</span>
          </button>
        </div>
      )}

      {/* Player persistente no canto inferior direito */}
      {!autoplayBlocked && (
        <div
          className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 max-w-[calc(100vw-1.5rem)]"
          role="region"
          aria-label="Player de Trilha Sonora Ambiente"
        >
          <div className="bg-[#282D13]/95 hover:bg-[#282D13] backdrop-blur-md border border-[#5d7328] text-[#F8EDD5] rounded-2xl shadow-2xl transition-all duration-200 overflow-visible relative">
            
            {/* Linha principal com controles compactos */}
            <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-xl bg-[#39421b] hover:bg-[#48551F] text-[#F8EDD5] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title={isPlaying ? 'Pausar trilha' : 'Tocar trilha'}
                aria-label={isPlaying ? 'Pausar trilha' : 'Tocar trilha'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 text-[#a8d363]" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-[#F8EDD5] ml-0.5" />
                )}
              </button>

              {/* Avançar para a próxima música */}
              <button
                type="button"
                onClick={handleNextTrack}
                className="w-8 h-8 rounded-xl hover:bg-[#39421b] text-[#F8EDD5] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Avançar para a próxima música"
                aria-label="Avançar para a próxima música"
              >
                <SkipForward className="w-3.5 h-3.5 text-[#cfc4a6] hover:text-[#F8EDD5]" />
              </button>

              {/* Mudo / Volume */}
              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 rounded-xl hover:bg-[#39421b] text-[#F8EDD5] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title={isMuted ? 'Reativar som' : 'Silenciar'}
                aria-label={isMuted ? 'Reativar som' : 'Silenciar'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#e58079]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#a8d363]" />
                )}
              </button>

              {/* Nome da faixa e gatilho de expansão */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 px-2 py-1 text-left text-xs cursor-pointer group select-none min-w-0"
                title="Expandir playlist e controle de volume"
              >
                <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[180px]">
                  <span className="text-[11px] font-bold text-[#F8EDD5] truncate leading-tight">
                    {currentTrack.title}
                  </span>
                  <span className="text-[9px] text-[#A69371] truncate leading-none mt-0.5">
                    {currentTrack.game} • {isMuted ? 'Mudo' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#F8EDD5] transition-colors shrink-0" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-[#A69371] group-hover:text-[#F8EDD5] transition-colors shrink-0" />
                )}
              </button>
            </div>

            {/* Menu expandido: abre para cima (bottom-full) para evitar cobrir qualquer elemento */}
            {isExpanded && (
              <div className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 bg-[#282D13]/95 backdrop-blur-md border border-[#5d7328] text-[#F8EDD5] rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in-50 zoom-in-95 z-50">
                {/* Cabeçalho da Playlist */}
                <div className="flex items-center justify-between pb-2 border-b border-[#3f4820] text-xs">
                  <span className="font-bold font-rpg text-[#F8EDD5] flex items-center gap-1.5">
                    <ListMusic className="w-4 h-4 text-[#a8d363]" />
                    <span>Playlist da Taverna ({PLAYLIST.length} faixas)</span>
                  </span>
                  <span className="text-[10px] text-[#A69371]">Loop contínuo</span>
                </div>

                {/* Lista de Músicas da Playlist */}
                <div className="space-y-1.5">
                  {PLAYLIST.map((track) => {
                    const isSelected = track.id === currentTrack.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => changeTrack(track, true)}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#3b451b] text-[#F8EDD5] font-bold border border-[#6b7a35]'
                            : 'hover:bg-[#343b17] text-[#cfc4a6]'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Music className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#a8d363]' : 'text-[#7d725a]'}`} />
                          <div className="truncate">
                            <div className="truncate text-[11px] leading-tight">
                              {track.title}
                            </div>
                            <div className="text-[9px] text-[#A69371] truncate">
                              {track.game}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] text-[#a8d363] shrink-0 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Tocando</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#7d725a] shrink-0">Ouvir</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Controle de Volume */}
                <div className="pt-2 border-t border-[#3f4820] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#A69371]">
                    <span>Volume</span>
                    <span className="font-mono font-bold text-[#F8EDD5]">
                      {isMuted ? '0% (Mudo)' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-3.5 h-3.5 text-[#A69371] shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1.5 bg-[#404b20] rounded-lg appearance-none cursor-pointer accent-[#a8d363]"
                      aria-label="Controle de volume da música"
                    />
                    <Volume2 className="w-3.5 h-3.5 text-[#A69371] shrink-0" />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
