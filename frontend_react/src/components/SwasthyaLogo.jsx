import React from 'react';

export const SwasthyaEmblem = ({ size = 48, className = '' }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 512 512" 
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
        <defs>
            <linearGradient id="swasthyaGradientComp" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="50%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="bgGradComp" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0369a1" />
                <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
            <filter id="softShadowComp" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0284c7" floodOpacity="0.25" />
            </filter>
        </defs>

        {/* Base Rounded Container */}
        <rect x="32" y="32" width="448" height="448" rx="110" fill="url(#bgGradComp)" filter="url(#softShadowComp)" />
        <rect x="36" y="36" width="440" height="440" rx="106" fill="none" stroke="#ffffff" strokeWidth="4" strokeOpacity="0.25" />

        {/* Medical Cross & Pulse */}
        <g transform="translate(256, 246) scale(0.95)">
            {/* Heart Background Glow */}
            <path 
                d="M 0,130 C -110,35 -190,-40 -190,-105 C -190,-160 -145,-200 -85,-200 C -38,-200 -12,-170 0,-135 C 12,-170 38,-200 85,-200 C 145,-200 190,-160 190,-105 C 190,-40 110,35 0,130 Z" 
                fill="url(#swasthyaGradientComp)" 
                opacity="0.25" 
            />

            {/* Crisp Cross */}
            <rect x="-34" y="-120" width="68" height="240" rx="34" fill="#ffffff" />
            <rect x="-120" y="-34" width="240" height="68" rx="34" fill="#ffffff" />

            {/* Dynamic ECG Heartbeat Pulse Line */}
            <path 
                d="M -105,0 L -45,0 L -25,-42 L -8,50 L 15,-60 L 32,38 L 52,-18 L 68,0 L 105,0" 
                fill="none" 
                stroke="url(#bgGradComp)" 
                strokeWidth="13" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />

            {/* Natural Wellness Leaf */}
            <path 
                d="M 46,-120 C 105,-175 180,-150 160,-85 C 115,-75 75,-95 46,-120 Z" 
                fill="#34d399" 
                opacity="0.95" 
            />
        </g>
    </svg>
);

export const SwasthyaLogo = ({ 
    size = 'normal', // 'small', 'normal', 'large'
    showTagline = true, 
    theme = 'light' // 'light', 'dark'
}) => {
    const emblemSize = size === 'small' ? 36 : size === 'large' ? 68 : 48;
    const titleSize = size === 'small' ? '18px' : size === 'large' ? '28px' : '22px';
    const subSize = size === 'small' ? '11px' : size === 'large' ? '13px' : '12px';

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'large' ? '14px' : '10px' }}>
            <SwasthyaEmblem size={emblemSize} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: titleSize,
                        fontWeight: '800',
                        letterSpacing: '-0.5px',
                        background: theme === 'dark' ? '#ffffff' : 'linear-gradient(135deg, #0284c7 0%, #0f766e 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: theme === 'dark' ? '#ffffff' : 'transparent',
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}>
                        Swasthya
                    </span>
                    <span style={{
                        fontSize: size === 'small' ? '10px' : '12px',
                        fontWeight: '700',
                        color: theme === 'dark' ? '#38bdf8' : '#0d9488',
                        background: theme === 'dark' ? 'rgba(56, 189, 248, 0.15)' : '#f0fdfa',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: `1px solid ${theme === 'dark' ? 'rgba(56, 189, 248, 0.3)' : '#ccfbf1'}`
                    }}>
                        सेतु
                    </span>
                </div>
                {showTagline && (
                    <span style={{
                        fontSize: subSize,
                        color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#64748b',
                        fontWeight: '500',
                        marginTop: '-2px'
                    }}>
                        Closed-Loop Rural Healthcare Bridge
                    </span>
                )}
            </div>
        </div>
    );
};

export default SwasthyaLogo;
