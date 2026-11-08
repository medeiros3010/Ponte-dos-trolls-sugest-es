import React from 'react';

interface PageBannerProps {
  title: string;
  subtitle?: string;
  tag?: string;
}

export const PageBanner: React.FC<PageBannerProps> = ({ title, subtitle, tag }) => {
  return (
    <div className="w-full relative overflow-hidden rounded-2xl shadow-md border border-[#444a27] bg-[#1d2210] mb-6 min-h-[120px] sm:min-h-[145px] flex items-center">
      {/* Background painted scenery and gradient */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: `url('/banner-trolls.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#171c0b] via-[#212711]/95 to-transparent z-10 sm:w-3/5" />

      {/* Right-aligned original Trolls artwork */}
      <div className="absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/2 flex items-center justify-end overflow-hidden pointer-events-none">
        <img
          src="/banner-trolls.png"
          alt="Os Trolls da Ponte"
          className="h-full w-auto object-cover object-left-top sm:object-right filter drop-shadow-lg"
        />
        {/* Soft edge blend overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#171c0b] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Content on the left */}
      <div className="relative z-20 px-6 sm:px-8 py-5 max-w-2xl">
        {tag && (
          <span className="inline-block px-2.5 py-0.5 mb-1.5 text-[11px] font-bold tracking-wider uppercase bg-[#343e18] text-[#d6c498] rounded border border-[#526127]">
            {tag}
          </span>
        )}
        <h1 className="font-rpg text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-wide text-[#F8EDD5] leading-tight drop-shadow-sm">
          {title}
        </h1>
        {subtitle && (
          <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm text-[#cfbf93] font-normal leading-relaxed">
            <span className="text-[#a8955d] font-serif font-bold text-base leading-none">|</span>
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    </div>
  );
};
