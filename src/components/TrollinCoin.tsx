import React, { useState, useRef, useEffect } from 'react';
import { TROLLIN_COIN_ICON_PATH, TROLLIN_EXPLANATION_TEXT } from '../utils/trollins';

interface TrollinCoinIconProps {
  size?: number;
  className?: string;
}

export const TrollinCoinIcon: React.FC<TrollinCoinIconProps> = ({ size = 20, className = '' }) => {
  return (
    <img
      src={TROLLIN_COIN_ICON_PATH}
      alt="Moeda Trollin"
      width={size}
      height={size}
      className={`inline-block object-contain select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

interface TrollinInfoBadgeProps {
  children?: React.ReactNode;
  iconSize?: number;
  showIcon?: boolean;
  label?: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const TrollinInfoBadge: React.FC<TrollinInfoBadgeProps> = ({
  children,
  iconSize = 20,
  showIcon = true,
  label,
  className = '',
  align = 'center',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsPinned(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsPinned(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const positionClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => {
        if (!isPinned) setIsOpen(false);
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const next = !(isOpen && isPinned);
          setIsPinned(next);
          setIsOpen(next);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
            setIsPinned(false);
          }
        }}
        aria-label={TROLLIN_EXPLANATION_TEXT}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A538] cursor-help"
      >
        {showIcon && <TrollinCoinIcon size={iconSize} />}
        {label && <span>{label}</span>}
        {children}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute bottom-full mb-2 ${positionClass} z-50 w-64 sm:w-72 p-3 rounded-xl bg-[#1F240D] text-[#F8EDD5] border border-[#D4A538] shadow-xl text-[11px] font-normal leading-relaxed text-left pointer-events-auto animate-in fade-in duration-150`}
        >
          <div className="flex items-start gap-2">
            <TrollinCoinIcon size={22} className="mt-0.5" />
            <span>{TROLLIN_EXPLANATION_TEXT}</span>
          </div>
        </div>
      )}
    </span>
  );
};
