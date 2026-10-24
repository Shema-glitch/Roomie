import React from 'react';
import { MascotState } from '../../types';
import { THEME } from '../../theme/tokens';

interface MascotViewProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bubbleText?: string;
  className?: string;
}

export const MascotView: React.FC<MascotViewProps> = ({
  state = 'idle',
  size = 'md',
  bubbleText,
  className = '',
}) => {
  const pixelSizes = {
    sm: 48,
    md: 80,
    lg: 120,
    xl: 160,
  };

  const dim = pixelSizes[size];

  // SVG representation of Roomie: a cute, round, plush companion
  const renderMascotBody = () => {
    switch (state) {
      case 'cheering':
        return (
          <g>
            {/* Mascot Body: happy warm coral-amber body */}
            <circle cx="50" cy="50" r="40" fill={THEME.colors.primary} />
            <circle cx="50" cy="54" r="32" fill="#FFA07A" opacity="0.3" />
            {/* Raised joyful paws */}
            <ellipse cx="20" cy="34" rx="8" ry="12" fill={THEME.colors.primaryDark} transform="rotate(-30 20 34)" />
            <ellipse cx="80" cy="34" rx="8" ry="12" fill={THEME.colors.primaryDark} transform="rotate(30 80 34)" />
            {/* Cheerful curved closed eyes */}
            <path d="M 33 44 Q 40 37 47 44" stroke={THEME.colors.ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 53 44 Q 60 37 67 44" stroke={THEME.colors.ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            {/* Blushing cheeks */}
            <ellipse cx="30" cy="53" rx="6" ry="3.5" fill="#FF4757" opacity="0.5" />
            <ellipse cx="70" cy="53" rx="6" ry="3.5" fill="#FF4757" opacity="0.5" />
            {/* Big smiling mouth */}
            <path d="M 42 52 Q 50 64 58 52" fill="#781E15" />
            <path d="M 45 56 Q 50 62 55 56" fill="#FFA07A" />
            {/* Little antenna / tuft */}
            <circle cx="50" cy="11" r="5" fill={THEME.colors.reward} />
            <path d="M 50 11 L 50 16" stroke={THEME.colors.primaryDark} strokeWidth="3" strokeLinecap="round" />
            {/* Sparkles */}
            <path d="M 14 20 L 16 14 L 22 16 L 16 18 Z" fill={THEME.colors.reward} />
            <path d="M 82 20 L 84 14 L 90 16 L 84 18 Z" fill={THEME.colors.reward} />
          </g>
        );

      case 'celebrating':
        return (
          <g>
            <circle cx="50" cy="52" r="40" fill={THEME.colors.primary} />
            {/* Party Hat */}
            <polygon points="50,4 34,26 66,26" fill={THEME.colors.reward} stroke={THEME.colors.rewardDark} strokeWidth="2" />
            <circle cx="50" cy="4" r="4" fill="#FFFFFF" />
            <path d="M 38 20 L 46 14" stroke={THEME.colors.info} strokeWidth="2" />
            <path d="M 48 24 L 58 17" stroke={THEME.colors.secondary} strokeWidth="2" />
            {/* Joyful Star eyes */}
            <polygon points="40,43 42,47 46,47 43,50 44,54 40,51 36,54 37,50 34,47 38,47" fill={THEME.colors.reward} />
            <polygon points="60,43 62,47 66,47 63,50 64,54 60,51 56,54 57,50 54,47 58,47" fill={THEME.colors.reward} />
            {/* Open celebration mouth */}
            <ellipse cx="50" cy="62" rx="9" ry="8" fill="#781E15" />
            <ellipse cx="50" cy="65" rx="6" ry="4" fill="#FFA07A" />
            {/* Rosy cheeks */}
            <ellipse cx="28" cy="56" rx="6" ry="4" fill="#FF4757" opacity="0.6" />
            <ellipse cx="72" cy="56" rx="6" ry="4" fill="#FF4757" opacity="0.6" />
            {/* Confetti specs */}
            <rect x="15" y="15" width="4" height="4" fill={THEME.colors.secondary} rx="1" transform="rotate(25 15 15)" />
            <circle cx="85" cy="22" r="3" fill={THEME.colors.reward} />
            <rect x="88" y="45" width="5" height="3" fill={THEME.colors.info} rx="1" transform="rotate(-15 88 45)" />
            <circle cx="12" cy="48" r="2.5" fill={THEME.colors.success} />
          </g>
        );

      case 'sleepy':
        return (
          <g>
            <circle cx="50" cy="50" r="40" fill="#E8927C" />
            {/* Nightcap */}
            <path d="M 30 20 Q 55 10 74 25 Q 85 45 92 48" fill={THEME.colors.info} opacity="0.85" />
            <circle cx="93" cy="49" r="6" fill="#FFFFFF" />
            {/* Droopy, peaceful closed eyelids */}
            <path d="M 33 48 Q 40 54 47 48" stroke={THEME.colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 53 48 Q 60 54 67 48" stroke={THEME.colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Soft small sleepy O mouth */}
            <ellipse cx="50" cy="58" rx="4" ry="4" fill={THEME.colors.ink} />
            {/* Soft blush */}
            <circle cx="28" cy="53" r="5" fill="#FF7875" opacity="0.4" />
            <circle cx="72" cy="53" r="5" fill="#FF7875" opacity="0.4" />
            {/* Z z z letters */}
            <text x="74" y="22" fill={THEME.colors.info} fontSize="14" fontWeight="bold" fontFamily="sans-serif">z</text>
            <text x="83" y="13" fill={THEME.colors.info} fontSize="10" fontWeight="bold" fontFamily="sans-serif">z</text>
          </g>
        );

      case 'thinking':
        return (
          <g>
            <circle cx="50" cy="50" r="40" fill={THEME.colors.primary} />
            {/* Puzzled / curious tilted eyes */}
            <circle cx="38" cy="42" r="6" fill={THEME.colors.ink} />
            <circle cx="40" cy="40" r="2" fill="#FFFFFF" />
            {/* One raised brow, one neutral brow */}
            <path d="M 32 32 Q 38 27 44 33" stroke={THEME.colors.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 56 36 Q 62 34 68 37" stroke={THEME.colors.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="62" cy="44" r="5" fill={THEME.colors.ink} />
            <circle cx="63" cy="42" r="1.5" fill="#FFFFFF" />
            {/* Hand on chin */}
            <ellipse cx="58" cy="62" rx="7" ry="6" fill={THEME.colors.primaryDark} />
            {/* Thoughtful wavy mouth */}
            <path d="M 40 56 Q 46 60 52 56" stroke={THEME.colors.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Floating thought bubbles */}
            <circle cx="78" cy="20" r="3" fill={THEME.colors.info} opacity="0.6" />
            <circle cx="86" cy="12" r="5" fill={THEME.colors.info} opacity="0.8" />
          </g>
        );

      case 'calm':
        return (
          <g>
            {/* Calm, caring posture: no frantic elements */}
            <circle cx="50" cy="50" r="40" fill={THEME.colors.primary} />
            <circle cx="50" cy="53" r="32" fill="#FFF" opacity="0.1" />
            {/* Soft, warm smiling eyes */}
            <path d="M 34 45 Q 40 40 46 45" stroke={THEME.colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 54 45 Q 60 40 66 45" stroke={THEME.colors.ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Warm gentle smile */}
            <path d="M 43 54 Q 50 60 57 54" stroke={THEME.colors.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Delicate warm cheeks */}
            <ellipse cx="30" cy="51" rx="5" ry="3" fill="#FFA07A" opacity="0.6" />
            <ellipse cx="70" cy="51" rx="5" ry="3" fill="#FFA07A" opacity="0.6" />
            {/* Resting friendly hands */}
            <ellipse cx="32" cy="68" rx="6" ry="5" fill={THEME.colors.primaryDark} />
            <ellipse cx="68" cy="68" rx="6" ry="5" fill={THEME.colors.primaryDark} />
          </g>
        );

      case 'idle':
      default:
        return (
          <g>
            <circle cx="50" cy="50" r="40" fill={THEME.colors.primary} />
            <circle cx="50" cy="54" r="30" fill="#FFF" opacity="0.1" />
            {/* Cute antenna tuft */}
            <circle cx="50" cy="12" r="4.5" fill={THEME.colors.reward} />
            <path d="M 50 12 L 50 18" stroke={THEME.colors.primaryDark} strokeWidth="2.5" strokeLinecap="round" />
            {/* Big glossy happy eyes */}
            <ellipse cx="38" cy="44" rx="5.5" ry="7" fill={THEME.colors.ink} />
            <circle cx="36" cy="41" r="2.2" fill="#FFFFFF" />
            <circle cx="39" cy="47" r="1.1" fill="#FFFFFF" />

            <ellipse cx="62" cy="44" rx="5.5" ry="7" fill={THEME.colors.ink} />
            <circle cx="60" cy="41" r="2.2" fill="#FFFFFF" />
            <circle cx="63" cy="47" r="1.1" fill="#FFFFFF" />
            {/* Rosy blushing cheeks */}
            <ellipse cx="29" cy="51" rx="5" ry="3" fill="#FF7875" opacity="0.5" />
            <ellipse cx="71" cy="51" rx="5" ry="3" fill="#FF7875" opacity="0.5" />
            {/* Friendly open smile */}
            <path d="M 44 53 Q 50 61 56 53" fill={THEME.colors.ink} />
          </g>
        );
    }
  };

  // Bounce class depending on state (calm has none)
  const getMotionClass = () => {
    switch (state) {
      case 'cheering':
        return 'animate-bounce';
      case 'celebrating':
        return 'animate-bounce';
      case 'thinking':
        return 'animate-pulse';
      case 'sleepy':
        return 'opacity-90';
      case 'calm':
        return '';
      case 'idle':
      default:
        return 'hover:scale-105 transition-transform duration-300';
    }
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {bubbleText && (
        <div
          className="mb-2 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-sm max-w-[200px] text-center border relative"
          style={{
            backgroundColor: THEME.colors.surface,
            borderColor: THEME.colors.line,
            color: THEME.colors.ink,
          }}
        >
          {bubbleText}
          <div
            className="w-2.5 h-2.5 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-b border-r"
            style={{
              backgroundColor: THEME.colors.surface,
              borderColor: THEME.colors.line,
            }}
          />
        </div>
      )}
      <div className={`relative ${getMotionClass()}`}>
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          className="drop-shadow-sm overflow-visible"
        >
          {renderMascotBody()}
        </svg>
      </div>
    </div>
  );
};
