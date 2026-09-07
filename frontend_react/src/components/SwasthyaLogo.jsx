import React from 'react';

export const SwasthyaEmblem = ({ size = 48, className = '' }) => (
    <div style={{
        width: size,
        height: size,
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 16px -3px rgba(2, 132, 199, 0.25)',
        border: '1.5px solid #e2e8f0',
        flexShrink: 0,
        padding: '2px'
    }} className={className}>
        <img 
            src="/logo.png" 
            alt="Swasthya Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
    </div>
);

export const SwasthyaLogo = ({ 
    size = 'normal', // 'small', 'normal', 'large'
    showTagline = true, 
    theme = 'light' // 'light', 'dark'
}) => {
    const emblemSize = size === 'small' ? 36 : size === 'large' ? 68 : 48;
    const titleSize = size === 'small' ? '18px' : size === 'large' ? '26px' : '22px';
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
