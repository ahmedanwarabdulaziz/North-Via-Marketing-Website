import { SANAD_LOGO } from '@/lib/sales-docs-shared';

/**
 * A round ink stamp: the company logo in the middle, the commercial register
 * on the upper arc and the tax card on the lower arc. Uneven ink and a slight tilt.
 */
export function CompanyStamp({
  commercialRegister,
  taxCard,
  color = '#1d3fa8',
  size = 150,
  rotate = -9,
}: {
  commercialRegister?: string;
  taxCard?: string;
  color?: string;
  size?: number;
  rotate?: number;
}) {
  const uid = `st${Math.abs([...`${commercialRegister}${taxCard}${color}`].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`;
  const font = "'Segoe UI', Tahoma, Arial, sans-serif";
  const topText = commercialRegister ? `سجل تجاري: ${commercialRegister}` : '';
  const bottomText = taxCard ? `بطاقة ضريبية: ${taxCard}` : '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 224 224"
      style={{ transform: `rotate(${rotate}deg)`, opacity: 0.88, mixBlendMode: 'multiply' }}
      role="img"
      aria-label="ختم الشركة"
    >
      <defs>
        <filter id={`${uid}-ink`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.45" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="speckled" />
          <feDisplacementMap in="speckled" in2="noise" scale="1.6" />
        </filter>
        <path id={`${uid}-top`} d="M 24 100 A 76 76 0 0 1 176 100" />
        <path id={`${uid}-bottom`} d="M 16 100 A 84 84 0 0 0 184 100" />
      </defs>
      <g filter={`url(#${uid}-ink)`} fill={color} stroke={color} strokeLinecap="round">
        <circle cx="100" cy="100" r="96" fill="none" strokeWidth="4" />
        <circle cx="100" cy="100" r="89" fill="none" strokeWidth="1.3" />
        <circle cx="100" cy="100" r="58" fill="none" strokeWidth="1.8" />
        {topText && (
          <text fontSize="13" fontWeight="700" textAnchor="middle" stroke="none" fontFamily={font}>
            <textPath href={`#${uid}-top`} startOffset="50%">{topText}</textPath>
          </text>
        )}
        {bottomText && (
          <text fontSize="13" fontWeight="700" textAnchor="middle" stroke="none" fontFamily={font}>
            <textPath href={`#${uid}-bottom`} startOffset="50%">{bottomText}</textPath>
          </text>
        )}
        <circle cx="21" cy="100" r="2.6" stroke="none" />
        <circle cx="179" cy="100" r="2.6" stroke="none" />
      </g>
      <image href={SANAD_LOGO} x="62" y="55" width="76" height="90" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}
