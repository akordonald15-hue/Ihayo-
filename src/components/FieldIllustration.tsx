import { ui } from '@/lib/copy';
export default function FieldIllustration() {
  return (
    <svg viewBox="0 0 580 600" className="field-art" role="img" aria-label={ui.artAlt}>
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#e4eddf" />
          <stop offset="1" stopColor="#f1edd9" />
        </linearGradient>
        <clipPath id="fieldclip">
          <rect x="20" y="30" width="540" height="540" rx="240" />
        </clipPath>
      </defs>
      <g clipPath="url(#fieldclip)">
        <rect width="580" height="600" fill="url(#sky)" />
        <circle cx="410" cy="165" r="58" fill="#e5b85f" />
        <path d="M0 290Q130 220 290 285T590 260V600H0Z" fill="#9db59a" />
        <path d="M0 360Q160 265 590 340V600H0" fill="#557c60" />
        <path d="M0 600Q170 360 590 370V600Z" fill="#d3ae6a" />
        <path
          d="M100 610Q220 410 580 395M220 620Q300 450 590 427M340 620Q370 490 590 465M460 620Q470 530 590 510"
          fill="none"
          stroke="#a78143"
          strokeWidth="8"
        />
        <path
          d="M0 380Q165 310 380 345M0 410Q145 340 315 365M0 440Q130 375 250 390M0 470Q100 420 180 422"
          fill="none"
          stroke="#75966e"
          strokeWidth="7"
        />
        <g transform="translate(255 292)">
          <path d="M0 100V0" stroke="#224e39" strokeWidth="7" strokeLinecap="round" />
          <path
            d="M0 57C-45 54-58 14-47 8C-16 7-3 34 0 57M0 30C38 24 47-9 39-13C13-11 1 9 0 30"
            fill="#245b45"
          />
        </g>
      </g>
      <rect
        x="20"
        y="30"
        width="540"
        height="540"
        rx="240"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
      />
      <circle cx="80" cy="116" r="6" fill="#245b45" />
      <path d="M65 116h30M80 101v30" stroke="#245b45" />
      <path d="M475 515h30M490 500v30" stroke="#245b45" />
    </svg>
  );
}
