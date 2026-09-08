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
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }} className={className}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(13, 148, 136, 0.12)',
                        color: 'var(--primary-color, #0d9488)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Globe size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                            {t('languageSectionTitle', 'भाषा चुनें (Language Settings)')}
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                            {t('languageSectionDesc', 'Select your preferred language for the app.')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {supportedLanguages.map((lang) => {
                        const isSelected = language === lang.code;
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '12px 8px',
                                    borderRadius: '12px',
                                    border: isSelected 
                                        ? '2px solid var(--primary-color, #0d9488)' 
                                        : '1px solid var(--border-color, #e2e8f0)',
                                    backgroundColor: isSelected 
                                        ? 'rgba(13, 148, 136, 0.08)' 
                                        : 'var(--bg-secondary, #f8fafc)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <span style={{ fontSize: '18px', marginBottom: '4px' }}>{lang.flag}</span>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: isSelected ? 700 : 600,
                                    color: isSelected ? 'var(--primary-color, #0d9488)' : 'var(--text-primary, #0f172a)'
                                }}>
                                    {lang.name}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    color: isSelected ? 'var(--primary-color, #0d9488)' : 'var(--text-secondary, #64748b)'
                                }}>
                                    {lang.englishName}
                                </span>
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '6px',
                                        right: '6px',
                                        backgroundColor: 'var(--primary-color, #0d9488)',
                                        color: '#ffffff',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={10} strokeWidth={3} />
                                    </div>
                                )}
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
