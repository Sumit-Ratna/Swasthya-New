import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check } from 'lucide-react';

export const LanguageSwitcher = ({ mode = 'pills', className = '' }) => {
    const { language, setLanguage, supportedLanguages, t } = useLanguage();

    if (mode === 'compact') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'var(--glass-bg, rgba(255, 255, 255, 0.8))',
                padding: '4px 8px',
                borderRadius: '20px',
                border: '1px solid var(--border-color, #e2e8f0)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(8px)'
            }} className={className}>
                <Globe size={14} style={{ color: 'var(--primary-color, #0d9488)' }} />
                {supportedLanguages.map((lang) => (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        style={{
                            border: 'none',
                            background: language === lang.code ? 'var(--primary-color, #0d9488)' : 'transparent',
                            color: language === lang.code ? '#ffffff' : 'var(--text-secondary, #64748b)',
                            fontWeight: language === lang.code ? '700' : '500',
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {lang.name}
                    </button>
                ))}
            </div>
        );
    }

    if (mode === 'card') {
        return (
            <div style={{
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '14px',
                padding: '10px 14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
            }} className={className}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(13, 148, 136, 0.12)',
                        color: 'var(--primary-color, #0d9488)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Globe size={15} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                            {t('languageSectionTitle', 'भाषा प्राथमिकता (Language)')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {supportedLanguages.map((lang) => {
                        const isSelected = language === lang.code;
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    border: isSelected 
                                        ? '1.5px solid var(--primary-color, #0d9488)' 
                                        : '1px solid var(--border-color, #e2e8f0)',
                                    backgroundColor: isSelected 
                                        ? 'var(--primary-color, #0d9488)' 
                                        : 'var(--bg-secondary, #f8fafc)',
                                    color: isSelected ? '#ffffff' : 'var(--text-primary, #0f172a)',
                                    fontWeight: isSelected ? 700 : 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? '0 2px 6px rgba(13, 148, 136, 0.3)' : 'none'
                                }}
                            >
                                {isSelected && <Check size={12} strokeWidth={3} />}
                                <span>{lang.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default pills
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} className={className}>
            <Globe size={16} style={{ color: 'var(--primary-color, #0d9488)' }} />
            {supportedLanguages.map((lang) => (
                <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: language === lang.code 
                            ? '1.5px solid var(--primary-color, #0d9488)' 
                            : '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: language === lang.code 
                            ? 'var(--primary-color, #0d9488)' 
                            : 'var(--glass-bg, #ffffff)',
                        color: language === lang.code ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        fontWeight: language === lang.code ? '700' : '500',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: language === lang.code ? '0 2px 8px rgba(13, 148, 136, 0.3)' : 'none'
                    }}
                >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
