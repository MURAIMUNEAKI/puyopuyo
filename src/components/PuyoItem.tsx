import React from 'react';
import { PuyoColor } from '../types/puyo';

interface PuyoItemProps {
  color: PuyoColor;
  size?: number; // pixel size
  isPopping?: boolean;
  isGhost?: boolean;
  connecting?: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  className?: string;
}

export const PuyoItem: React.FC<PuyoItemProps> = ({
  color,
  size = 36,
  isPopping = false,
  isGhost = false,
  connecting = { top: false, right: false, bottom: false, left: false },
  className = '',
}) => {
  // Color theme definitions: gradients, highlights, shadow
  const colorStyles: Record<
    PuyoColor,
    {
      bg: string;
      border: string;
      shadow: string;
      highlight: string;
      eyePupil: string;
    }
  > = {
    red: {
      bg: 'linear-gradient(135deg, #ff4d6d 0%, #e60039 60%, #b3002a 100%)',
      border: '#ff758f',
      shadow: 'rgba(230, 0, 57, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.65)',
      eyePupil: '#40000e',
    },
    green: {
      bg: 'linear-gradient(135deg, #52e374 0%, #20b847 60%, #11802e 100%)',
      border: '#78f096',
      shadow: 'rgba(32, 184, 71, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.65)',
      eyePupil: '#063612',
    },
    blue: {
      bg: 'linear-gradient(135deg, #4da8ff 0%, #0077e6 60%, #004fb3 100%)',
      border: '#75beff',
      shadow: 'rgba(0, 119, 230, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.65)',
      eyePupil: '#002047',
    },
    yellow: {
      bg: 'linear-gradient(135deg, #ffe14d 0%, #f5ad00 60%, #cc8800 100%)',
      border: '#fff080',
      shadow: 'rgba(245, 173, 0, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.75)',
      eyePupil: '#4a3300',
    },
    purple: {
      bg: 'linear-gradient(135deg, #c77dff 0%, #9d4edd 60%, #5a189a 100%)',
      border: '#e0aaff',
      shadow: 'rgba(157, 78, 221, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.65)',
      eyePupil: '#240046',
    },
    garbage: {
      bg: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 60%, #64748b 100%)',
      border: '#e2e8f0',
      shadow: 'rgba(100, 116, 139, 0.4)',
      highlight: 'rgba(255, 255, 255, 0.5)',
      eyePupil: '#334155',
    },
  };

  const style = colorStyles[color];
  const isGarbage = color === 'garbage';

  // Connecting borders / radiuses
  // If connecting to adjacent sides, flatten corresponding corners to create continuous fluid blob!
  const radiusTopLeft = (connecting.top || connecting.left) ? '6px' : '50%';
  const radiusTopRight = (connecting.top || connecting.right) ? '6px' : '50%';
  const radiusBottomRight = (connecting.bottom || connecting.right) ? '6px' : '50%';
  const radiusBottomLeft = (connecting.bottom || connecting.left) ? '6px' : '50%';

  const borderRadius = `${radiusTopLeft} ${radiusTopRight} ${radiusBottomRight} ${radiusBottomLeft}`;

  return (
    <div
      className={`relative flex items-center justify-center transition-all ${
        isPopping ? 'animate-ping duration-300 opacity-90 scale-125' : ''
      } ${isGhost ? 'opacity-35' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Outer Connecting Bridges */}
      {connecting.top && (
        <div
          className="absolute -top-[4px] w-[60%] h-[8px] z-0"
          style={{ background: style.bg }}
        />
      )}
      {connecting.bottom && (
        <div
          className="absolute -bottom-[4px] w-[60%] h-[8px] z-0"
          style={{ background: style.bg }}
        />
      )}
      {connecting.left && (
        <div
          className="absolute -left-[4px] h-[60%] w-[8px] z-0"
          style={{ background: style.bg }}
        />
      )}
      {connecting.right && (
        <div
          className="absolute -right-[4px] h-[60%] w-[8px] z-0"
          style={{ background: style.bg }}
        />
      )}

      {/* Main Puyo Body */}
      <div
        className="w-full h-full relative z-10 flex items-center justify-center transition-transform"
        style={{
          background: style.bg,
          borderRadius,
          boxShadow: isGhost
            ? 'none'
            : `inset 0 -3px 5px rgba(0,0,0,0.35), 0 3px 6px ${style.shadow}`,
          border: isGhost ? `2px dashed ${style.border}` : `1.5px solid ${style.border}`,
        }}
      >
        {/* Glossy top-left highlight */}
        {!isGhost && (
          <div
            className="absolute top-[12%] left-[18%] w-[38%] h-[24%] rounded-full pointer-events-none"
            style={{
              background: style.highlight,
              transform: 'rotate(-25deg)',
            }}
          />
        )}

        {/* Eyes */}
        {!isGhost && !isGarbage && (
          <div className="flex items-center gap-[3px] pointer-events-none translate-y-[1px]">
            {/* Left eye */}
            <div className="w-[8px] h-[10px] bg-white rounded-full flex items-center justify-center relative shadow-xs">
              <div
                className="w-[4px] h-[5px] rounded-full absolute bottom-[1px] right-[1px]"
                style={{ backgroundColor: style.eyePupil }}
              >
                <div className="w-[1.5px] h-[1.5px] bg-white rounded-full absolute top-[0.5px] left-[0.5px]" />
              </div>
            </div>
            {/* Right eye */}
            <div className="w-[8px] h-[10px] bg-white rounded-full flex items-center justify-center relative shadow-xs">
              <div
                className="w-[4px] h-[5px] rounded-full absolute bottom-[1px] left-[1px]"
                style={{ backgroundColor: style.eyePupil }}
              >
                <div className="w-[1.5px] h-[1.5px] bg-white rounded-full absolute top-[0.5px] left-[0.5px]" />
              </div>
            </div>
          </div>
        )}

        {/* Garbage Puyo Eyes: Comical dizzy spirals */}
        {!isGhost && isGarbage && (
          <div className="flex items-center gap-[2px] pointer-events-none">
            <svg
              className="w-[10px] h-[10px] text-slate-700 animate-spin"
              style={{ animationDuration: '6s' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4a8 8 0 0 1 8 8" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            <svg
              className="w-[10px] h-[10px] text-slate-700 animate-spin"
              style={{ animationDuration: '6s', animationDirection: 'reverse' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4a8 8 0 0 1 8 8" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
