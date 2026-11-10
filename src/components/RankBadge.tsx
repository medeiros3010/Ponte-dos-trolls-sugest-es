import React from 'react';

export interface RankBadgeProps {
  level: number;
  size?: number | string;
  className?: string;
  showTitle?: boolean;
}

/**
 * Brasão Rank 1 - Aprendiz da Ponte (0-10 aquisições)
 * Direção: Ponte simples em bronze, com uma pequena runa.
 */
export const BrasaoAprendiz: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Aprendiz da Ponte"
  >
    {/* Contorno externo de madeira/bronze */}
    <path
      d="M32 4L10 14V34C10 47.5 19.5 57 32 60C44.5 57 54 47.5 54 34V14L32 4Z"
      fill="#442D18"
      stroke="#7A5328"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Fundo interno bronze escovado */}
    <path
      d="M32 7L13 15.5V33.5C13 45.2 21.2 53.6 32 56.5C42.8 53.6 51 45.2 51 33.5V15.5L32 7Z"
      fill="#8C6239"
    />
    <path
      d="M32 7L13 15.5V33.5C13 38 15 42 18 45L32 7Z"
      fill="#A27344"
      opacity="0.35"
    />
    {/* Borda interna em bronze polido */}
    <path
      d="M32 10L16 17.5V33C16 43 23 50.5 32 53C41 50.5 48 43 48 33V17.5L32 10Z"
      fill="#5A3A1C"
      stroke="#C59B6D"
      strokeWidth="1.5"
    />

    {/* Ponte de Pedra/Bronze em Arco Rústico */}
    {/* Água sob a ponte */}
    <path
      d="M20 44C24 42.5 28 42 32 42C36 42 40 42.5 44 44C42 48 37 50.5 32 51C27 50.5 22 48 20 44Z"
      fill="#3A2B18"
    />
    {/* Pilares da ponte */}
    <rect x="18" y="27" width="6" height="15" rx="1" fill="#9C7242" stroke="#442D18" strokeWidth="1" />
    <rect x="40" y="27" width="6" height="15" rx="1" fill="#9C7242" stroke="#442D18" strokeWidth="1" />
    {/* Tabuleiro / Parapeito da ponte */}
    <path
      d="M17 26C21 24.5 27 24 32 24C37 24 43 24.5 47 26V30H17V26Z"
      fill="#C59B6D"
      stroke="#442D18"
      strokeWidth="1"
    />
    {/* Arco da ponte */}
    <path
      d="M24 42C24 34 27.5 31 32 31C36.5 31 40 34 40 42H36C36 36 34.5 34 32 34C29.5 34 28 36 28 42H24Z"
      fill="#DDB888"
      stroke="#5A3A1C"
      strokeWidth="0.8"
    />
    {/* Linhas de cantaria na ponte */}
    <line x1="21" y1="31" x2="21" y2="38" stroke="#5A3A1C" strokeWidth="0.8" />
    <line x1="43" y1="31" x2="43" y2="38" stroke="#5A3A1C" strokeWidth="0.8" />
    <line x1="32" y1="24.5" x2="32" y2="30" stroke="#5A3A1C" strokeWidth="0.8" />

    {/* Runa Rústica Luminosa no topo (Runa nórdica da jornada/travessia) */}
    <circle cx="32" cy="18" r="4.5" fill="#3A2B18" stroke="#C59B6D" strokeWidth="1" />
    <path
      d="M32 15V21M30 16.5L34 19.5M34 16.5L30 19.5"
      stroke="#55C5B0"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="32" cy="18" r="1.5" fill="#E0F7F2" />
  </svg>
);

/**
 * Brasão Rank 2 - Aventureiro (11-30 aquisições)
 * Direção: Escudo verde-oliva com ponte e espada.
 */
export const BrasaoAventureiro: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Aventureiro"
  >
    {/* Borda externa de couro e bronze */}
    <path
      d="M32 4L8 13V33C8 47.5 18.5 57.5 32 61C45.5 57.5 56 47.5 56 33V13L32 4Z"
      fill="#262D11"
      stroke="#8F9F5B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Campo verde-oliva */}
    <path
      d="M32 7.5L11 15V32.5C11 44.8 20 53.5 32 56.5C44 53.5 53 44.8 53 32.5V15L32 7.5Z"
      fill="#48551F"
    />
    {/* Meio-lado sombreado para profundidade 3D */}
    <path
      d="M32 7.5L11 15V32.5C11 44.8 20 53.5 32 56.5V7.5Z"
      fill="#596A27"
      opacity="0.35"
    />

    {/* Borda interna refinada com cravos de bronze */}
    <path
      d="M32 11L14.5 17.5V32C14.5 42 22 49.5 32 52.5C42 49.5 49.5 42 49.5 32V17.5L32 11Z"
      stroke="#C6AD78"
      strokeWidth="1.2"
      fill="none"
    />
    <circle cx="15" cy="18" r="1.2" fill="#C6AD78" />
    <circle cx="49" cy="18" r="1.2" fill="#C6AD78" />
    <circle cx="32" cy="51" r="1.2" fill="#C6AD78" />

    {/* Silhueta da Ponte na base */}
    <path
      d="M17 38C22 36.5 27 36 32 36C37 36 42 36.5 47 38V44C42 47.5 37 49 32 49.5C27 49 22 47.5 17 44V38Z"
      fill="#282E13"
      stroke="#C6AD78"
      strokeWidth="1"
    />
    {/* Arco da ponte sob a espada */}
    <path
      d="M26 44C26 39 28.5 37 32 37C35.5 37 38 39 38 44"
      stroke="#EADBBE"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />

    {/* Espada clássica de Aventureiro apontando para cima */}
    {/* Pomo da espada */}
    <circle cx="32" cy="13" r="2.2" fill="#C6AD78" stroke="#262D11" strokeWidth="0.8" />
    {/* Empunhadura/Cabo */}
    <rect x="31" y="15" width="2" height="6" fill="#6A502D" rx="0.5" />
    {/* Guarda/Cruzeta da espada */}
    <path
      d="M24 21C27 21.5 31 22 32 22C33 22 37 21.5 40 21C40.5 22 39.5 23 37 23.2C34 23.5 33 24 32 24C31 24 30 23.5 27 23.2C24.5 23 23.5 22 24 21Z"
      fill="#C6AD78"
      stroke="#3A2B18"
      strokeWidth="0.8"
    />
    {/* Lâmina de aço brilhante */}
    <path
      d="M31.2 24L31 43L32 47L33 43L32.8 24H31.2Z"
      fill="#E6EEF5"
      stroke="#3A4856"
      strokeWidth="0.6"
    />
    {/* Chanfro da lâmina */}
    <line x1="32" y1="24" x2="32" y2="45" stroke="#9BB0C1" strokeWidth="0.6" />
  </svg>
);

/**
 * Brasão Rank 3 - Veterano (31-50 aquisições)
 * Direção: Escudo de aço com espadas cruzadas e detalhes azuis.
 */
export const BrasaoVeterano: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Veterano"
  >
    {/* Duas espadas cruzadas atrás do escudo (cross-swords) */}
    {/* Espada 1 (diagonal esq-superior para dir-inferior) */}
    <g>
      <circle cx="10" cy="10" r="2.2" fill="#C6AD78" stroke="#1E2A38" strokeWidth="0.7" />
      <rect x="11.5" y="11.5" width="2" height="6" transform="rotate(-45 11.5 11.5)" fill="#4A3B2C" />
      <path d="M8 17L17 8" stroke="#C6AD78" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 15L52 52" stroke="#E2ECF5" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15L52 52" stroke="#4A627A" strokeWidth="0.8" />
    </g>
    {/* Espada 2 (diagonal dir-superior para esq-inferior) */}
    <g>
      <circle cx="54" cy="10" r="2.2" fill="#C6AD78" stroke="#1E2A38" strokeWidth="0.7" />
      <rect x="51.5" y="10" width="2" height="6" transform="rotate(45 51.5 10)" fill="#4A3B2C" />
      <path d="M56 17L47 8" stroke="#C6AD78" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M49 15L12 52" stroke="#E2ECF5" strokeWidth="2" strokeLinecap="round" />
      <path d="M49 15L12 52" stroke="#4A627A" strokeWidth="0.8" />
    </g>

    {/* Escudo de Aço Principal */}
    <path
      d="M32 8L14 16V34C14 46.5 22 55.5 32 59C42 55.5 50 46.5 50 34V16L32 8Z"
      fill="#2A3848"
      stroke="#8DA4BA"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Superfície de aço escovado */}
    <path
      d="M32 11L16.5 18V33C16.5 44 23.5 52 32 55C40.5 52 47.5 44 47.5 33V18L32 11Z"
      fill="#566B7E"
    />
    <path
      d="M32 11L16.5 18V33C16.5 44 23.5 52 32 55V11Z"
      fill="#7B93A8"
      opacity="0.4"
    />

    {/* Chevron / Faixa heráldica em Azul Cobalto */}
    <path
      d="M32 20L18 29V37L32 27L46 37V29L32 20Z"
      fill="#1E3E66"
      stroke="#4D88C7"
      strokeWidth="1"
    />
    <path
      d="M32 28L22 35V42L32 34L42 42V35L32 28Z"
      fill="#2A5285"
      stroke="#6AA6E8"
      strokeWidth="0.8"
    />

    {/* Rebites de aço no perímetro do escudo */}
    <circle cx="19" cy="20" r="1.3" fill="#D8E4EE" stroke="#1E2A38" strokeWidth="0.5" />
    <circle cx="45" cy="20" r="1.3" fill="#D8E4EE" stroke="#1E2A38" strokeWidth="0.5" />
    <circle cx="17.5" cy="33" r="1.3" fill="#D8E4EE" stroke="#1E2A38" strokeWidth="0.5" />
    <circle cx="46.5" cy="33" r="1.3" fill="#D8E4EE" stroke="#1E2A38" strokeWidth="0.5" />
    <circle cx="32" cy="51" r="1.3" fill="#D8E4EE" stroke="#1E2A38" strokeWidth="0.5" />

    {/* Pequeno medalhão central de honra veterana */}
    <circle cx="32" cy="38" r="4.5" fill="#1C2E42" stroke="#A6BED4" strokeWidth="1" />
    <polygon points="32,35 34,40 30,37 34,37 30,40" fill="#E8F2FA" />
  </svg>
);

/**
 * Brasão Rank 4 - Herói (51-70 aquisições)
 * Direção: Brasão dourado com louros e uma gema.
 */
export const BrasaoHeroi: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Herói"
  >
    {/* Guirlanda de Louros Dourados nos dois lados */}
    {/* Louros lado esquerdo */}
    <path
      d="M16 46C11 41 9 32 10 24C10.5 20 12 17 14 15C13 19 13.5 24 16 28C17 23 18 19 20 16C19.5 21 21 26 23 29C21 34 19 40 16 46Z"
      fill="#D4A538"
      stroke="#8C6512"
      strokeWidth="0.8"
    />
    <circle cx="11" cy="22" r="1.5" fill="#FFE58F" />
    <circle cx="13" cy="31" r="1.5" fill="#FFE58F" />
    <circle cx="16" cy="40" r="1.5" fill="#FFE58F" />

    {/* Louros lado direito */}
    <path
      d="M48 46C53 41 55 32 54 24C53.5 20 52 17 50 15C51 19 50.5 24 48 28C47 23 46 19 44 16C44.5 21 43 26 41 29C43 34 45 40 48 46Z"
      fill="#D4A538"
      stroke="#8C6512"
      strokeWidth="0.8"
    />
    <circle cx="53" cy="22" r="1.5" fill="#FFE58F" />
    <circle cx="51" cy="31" r="1.5" fill="#FFE58F" />
    <circle cx="48" cy="40" r="1.5" fill="#FFE58F" />

    {/* Brasão Central Dourado */}
    <path
      d="M32 7L16 15V33C16 45 23 54 32 58C41 54 48 45 48 33V15L32 7Z"
      fill="#6B4E0D"
      stroke="#E5B942"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Fundo dourado real */}
    <path
      d="M32 9.5L18.5 16.5V32.5C18.5 43 24.5 50.8 32 54.5C39.5 50.8 45.5 43 45.5 32.5V16.5L32 9.5Z"
      fill="#B88B1E"
    />
    <path
      d="M32 9.5L18.5 16.5V32.5C18.5 43 24.5 50.8 32 54.5V9.5Z"
      fill="#D4A538"
      opacity="0.4"
    />

    {/* Bordura ornamentada interna */}
    <path
      d="M32 13L21.5 18.5V32C21.5 40.5 26.5 47 32 50C37.5 47 42.5 40.5 42.5 32V18.5L32 13Z"
      stroke="#FFF1A8"
      strokeWidth="1.2"
      fill="#8C6512"
    />

    {/* Grande Gema Rubi Lapidada no centro do brasão */}
    <g filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">
      {/* Facetas do Rubi */}
      <polygon points="32,20 38,26 36,36 32,41 28,36 26,26" fill="#A81424" stroke="#FFE58F" strokeWidth="1" />
      <polygon points="32,20 38,26 32,28 26,26" fill="#DE2C3E" />
      <polygon points="26,26 32,28 32,41 28,36" fill="#8C0D1B" />
      <polygon points="38,26 32,28 32,41 36,36" fill="#BF1B2C" />
      {/* Brilho da gema */}
      <polygon points="29,24 33,22 32,26 28,26" fill="#FFA3AB" opacity="0.8" />
      <circle cx="31" cy="24" r="1" fill="#FFFFFF" />
    </g>

    {/* Fita de ouro na base unindo os louros */}
    <path
      d="M26 49C29 48 35 48 38 49L37 53C34 52 30 52 27 53L26 49Z"
      fill="#D4A538"
      stroke="#6B4E0D"
      strokeWidth="0.8"
    />
  </svg>
);

/**
 * Brasão Rank 5 - Paragon (71-100 aquisições)
 * Direção visual: Brasão violeta e dourado com coroa e runas.
 */
export const BrasaoParagon: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Paragon"
  >
    {/* Coroa Soberana Imperial no topo */}
    <g>
      {/* Base da coroa */}
      <path
        d="M20 18H44L42 22H22L20 18Z"
        fill="#D4A538"
        stroke="#5C3E08"
        strokeWidth="1"
      />
      {/* Pontas da coroa com 5 agulhas e gemas */}
      <path
        d="M20 18L21 11L26 15L32 8L38 15L43 11L44 18H20Z"
        fill="#F5D678"
        stroke="#7A5208"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="11" r="1.5" fill="#9B26B6" stroke="#D4A538" strokeWidth="0.6" />
      <circle cx="26" cy="15" r="1.2" fill="#E53935" />
      <circle cx="32" cy="8" r="2" fill="#9B26B6" stroke="#D4A538" strokeWidth="0.6" />
      <circle cx="38" cy="15" r="1.2" fill="#E53935" />
      <circle cx="43" cy="11" r="1.5" fill="#9B26B6" stroke="#D4A538" strokeWidth="0.6" />
    </g>

    {/* Escudo Púrpura/Violeta Real */}
    <path
      d="M32 19L13 24V37C13 49 21.5 57.5 32 61C42.5 57.5 51 49 51 37V24L32 19Z"
      fill="#280D3D"
      stroke="#D4A538"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Fundo violeta místico */}
    <path
      d="M32 21.5L15.5 26V36.5C15.5 47 23 54.8 32 58C41 54.8 48.5 47 48.5 36.5V26L32 21.5Z"
      fill="#4F1C75"
    />
    <path
      d="M32 21.5L15.5 26V36.5C15.5 47 23 54.8 32 58V21.5Z"
      fill="#6B289E"
      opacity="0.45"
    />

    {/* Filigrana e Bordura Dourada Interna */}
    <path
      d="M32 24.5L18.5 28.5V36C18.5 44.5 24.5 51 32 54C39.5 51 45.5 44.5 45.5 36V28.5L32 24.5Z"
      stroke="#F5D678"
      strokeWidth="1.2"
      fill="none"
    />

    {/* Runa Arcana Dourada no centro (Runa da Lenda e Ascensão) */}
    <g filter="drop-shadow(0 0 2px rgba(245,214,120,0.7))">
      <circle cx="32" cy="38" r="8" fill="#361153" stroke="#D4A538" strokeWidth="1.2" />
      {/* Símbolo rúnico de sabedoria arcana */}
      <path
        d="M28 36C28 34 30 33 32 35C34 37 36 36 36 34M28 40C28 42 30 43 32 41C34 39 36 40 36 42"
        stroke="#FFE58F"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line x1="32" y1="31" x2="32" y2="45" stroke="#FFE58F" strokeWidth="1.4" strokeLinecap="round" />
    </g>

    {/* Pequenas Runas de Borda cintilantes */}
    <circle cx="21" cy="31" r="1" fill="#FCE588" />
    <circle cx="43" cy="31" r="1" fill="#FCE588" />
    <circle cx="21" cy="42" r="1" fill="#FCE588" />
    <circle cx="43" cy="42" r="1" fill="#FCE588" />
  </svg>
);
export const BrasaoLenda = BrasaoParagon;

/**
 * Brasão Rank 6 - Divindade (101+ aquisições)
 * Direção visual: Brasão dourado e marfim com dragão protegendo uma ponte.
 */
export const BrasaoDivindade: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-md ${className}`}
    aria-label="Brasão Divindade"
  >
    {/* Asas do Dragão Ancestral abrindo-se no fundo */}
    <path
      d="M32 14C23 6 12 8 4 17C10 24 13 32 14 40C19 32 25 24 32 22C39 24 45 32 50 40C51 32 54 24 60 17C52 8 41 6 32 14Z"
      fill="#521319"
      stroke="#D4A538"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M32 16C24 9 14 11 7 19C12 25 15 31 16 38C20 31 26 24 32 23C38 24 44 31 48 38C49 31 52 25 57 19C50 11 40 9 32 16Z"
      fill="#851D27"
    />

    {/* Cabeça do Dragão Ancestral no topo com chifres dourados */}
    <g>
      {/* Chifres */}
      <path d="M28 10C26 6 22 4 18 5C21 8 24 11 26 13" stroke="#F5D678" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 10C38 6 42 4 46 5C43 8 40 11 38 13" stroke="#F5D678" strokeWidth="2" strokeLinecap="round" />
      {/* Crânio e Focinho */}
      <path
        d="M27 10L32 4L37 10L35 16L32 17L29 16L27 10Z"
        fill="#A32430"
        stroke="#F5D678"
        strokeWidth="1"
      />
      {/* Olhos dourados faiscantes */}
      <circle cx="30" cy="11" r="1.1" fill="#FFEB3B" />
      <circle cx="34" cy="11" r="1.1" fill="#FFEB3B" />
    </g>

    {/* Escudo Oval em Marfim e Ouro Solar */}
    <path
      d="M32 18C20 18 12 27 12 38C12 49 20 58 32 61C44 58 52 49 52 38C52 27 44 18 32 18Z"
      fill="#282215"
      stroke="#D4A538"
      strokeWidth="2.5"
    />
    {/* Campo em Marfim Nobre */}
    <path
      d="M32 20.5C21.5 20.5 14.5 28.5 14.5 38C14.5 47.5 21.5 55.5 32 58.5C42.5 55.5 49.5 47.5 49.5 38C49.5 28.5 42.5 20.5 32 20.5Z"
      fill="#FDFBF7"
    />
    <path
      d="M32 20.5C21.5 20.5 14.5 28.5 14.5 38C14.5 47.5 21.5 55.5 32 58.5V20.5Z"
      fill="#EFE8D6"
      opacity="0.6"
    />

    {/* Borda dourada em relevo marfim */}
    <path
      d="M32 23C23.5 23 17.5 29.5 17.5 38C17.5 45.5 23.5 52 32 54.5C40.5 52 46.5 45.5 46.5 38C46.5 29.5 40.5 23 32 23Z"
      stroke="#C6AD78"
      strokeWidth="1.2"
      fill="none"
    />

    {/* Ponte Monumental no centro sob a proteção do dragão */}
    <path
      d="M20 48C24 46.5 28 46 32 46C36 46 40 46.5 44 48C41 52.5 36.5 54.5 32 55C27.5 54.5 23 52.5 20 48Z"
      fill="#26384C"
    />
    <rect x="21" y="36" width="4.5" height="12" rx="1" fill="#C59B6D" stroke="#7A5208" strokeWidth="0.8" />
    <rect x="38.5" y="36" width="4.5" height="12" rx="1" fill="#C59B6D" stroke="#7A5208" strokeWidth="0.8" />
    <path
      d="M19 35C23 33.5 28 33 32 33C36 33 41 33.5 45 35V38H19V35Z"
      fill="#F5D678"
      stroke="#7A5208"
      strokeWidth="1"
    />
    <path
      d="M25.5 48C25.5 41 28 38 32 38C36 38 38.5 41 38.5 48H35.5C35.5 43 34 40.5 32 40.5C30 40.5 28.5 43 28.5 48H25.5Z"
      fill="#FFF4BA"
      stroke="#8C6512"
      strokeWidth="0.8"
    />

    {/* Gema Solar guardada no topo do tabuleiro */}
    <circle cx="32" cy="28" r="3.5" fill="#E65100" stroke="#FFE58F" strokeWidth="1" />
    <polygon points="32,25 34.5,28 32,31 29.5,28" fill="#FFF176" />
  </svg>
);
export const BrasaoGuardiaoLendario = BrasaoDivindade;

/**
 * Componente Mestre Guardião (Admin Especial da Mesa)
 */
export const BrasaoMestreAdmin: React.FC<{ size?: number | string; className?: string }> = ({
  size = 32,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    width={size}
    height={size}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-sm ${className}`}
    aria-label="Brasão Mestre Guardião"
  >
    <path
      d="M32 4L10 14V33C10 47.5 19.5 57 32 60C44.5 57 54 47.5 54 33V14L32 4Z"
      fill="#282D13"
      stroke="#C6AD78"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M32 7.5L13.5 16V32.5C13.5 44.5 21.5 52.8 32 55.5C42.5 52.8 50.5 44.5 50.5 32.5V16L32 7.5Z"
      fill="#3A4419"
    />
    {/* Torre/Ponte do Mestre */}
    <path
      d="M22 42V30L26 26H38L42 30V42H22Z"
      fill="#EADBBE"
      stroke="#716016"
      strokeWidth="1"
    />
    <rect x="29" y="34" width="6" height="8" rx="3" fill="#282D13" />
    {/* Coroa do Mestre */}
    <path
      d="M26 22L28 17L32 20L36 17L38 22H26Z"
      fill="#D4A538"
      stroke="#716016"
      strokeWidth="0.8"
    />
  </svg>
);

/**
 * Componente seletor universal de Brasão do Rank
 */
export const RankBadgeIcon: React.FC<RankBadgeProps> = ({
  level,
  size = 32,
  className = '',
}) => {
  switch (level) {
    case 1:
      return <BrasaoAprendiz size={size} className={className} />;
    case 2:
      return <BrasaoAventureiro size={size} className={className} />;
    case 3:
      return <BrasaoVeterano size={size} className={className} />;
    case 4:
      return <BrasaoHeroi size={size} className={className} />;
    case 5:
      return <BrasaoParagon size={size} className={className} />;
    case 6:
      return <BrasaoDivindade size={size} className={className} />;
    case 99: // Mestre
      return <BrasaoMestreAdmin size={size} className={className} />;
    default:
      return <BrasaoAprendiz size={size} className={className} />;
  }
};
