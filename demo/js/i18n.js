/**
 * Internationalization (i18n) Module
 * Handles multi-language support with JSON locale files
 */

(function() {
    'use strict';

    const LANG_KEY = 'preferred-language';
    const DEFAULT_LANG = 'zh-CN';
    const SUPPORTED_LANGS = {
        'zh-CN': '中文',
        'en': 'English',
        'ja': '日本語',
        'fr': 'Français',
        'de': 'Deutsch'
    };

    let currentLang = DEFAULT_LANG;
    let translations = {};

    // Get nested object property by dot notation
    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    // Check if language is supported
    function isSupported(lang) {
        return lang && SUPPORTED_LANGS.hasOwnProperty(lang);
    }

    // Detect browser language
    function detectBrowserLang() {
        const browserLang = navigator.language || navigator.userLanguage || '';

        // Check exact match first
        if (isSupported(browserLang)) {
            return browserLang;
        }

        // Check language prefix (e.g., 'en-US' -> 'en', 'zh-TW' -> 'zh-CN')
        const langPrefix = browserLang.split('-')[0];

        // Find matching language
        for (const lang of Object.keys(SUPPORTED_LANGS)) {
            if (lang === langPrefix || lang.startsWith(langPrefix + '-')) {
                return lang;
            }
        }

        return DEFAULT_LANG;
    }

    // Get preferred language from URL, localStorage, or browser
    function getPreferredLang() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (isSupported(urlLang)) {
            return urlLang;
        }

        // Check localStorage
        const savedLang = localStorage.getItem(LANG_KEY);
        if (isSupported(savedLang)) {
            return savedLang;
        }

        // Detect from browser
        return detectBrowserLang();
    }

    // Load translation file
    async function loadTranslations(lang) {
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`locales/${lang}.json?_=${cacheBuster}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${lang} translations:`, error);
            // Fallback to default language
            if (lang !== DEFAULT_LANG) {
                return loadTranslations(DEFAULT_LANG);
            }
            return {};
        }
    }

    // Apply translations to DOM elements
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = getNestedValue(translations, key);

            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = currentLang;

        // Update current language display in header
        const currentLangDisplay = document.getElementById('currentLang');
        if (currentLangDisplay) {
            currentLangDisplay.textContent = SUPPORTED_LANGS[currentLang] || currentLang;
        }

        // Update active state in dropdown
        document.querySelectorAll('.lang-option').forEach(option => {
            const isActive = option.getAttribute('data-lang') === currentLang;
            option.classList.toggle('active', isActive);
        });
    }

    // Set language - main function
    async function setLanguage(lang) {
        console.log('setLanguage called with:', lang);

        if (!isSupported(lang)) {
            console.warn(`Language "${lang}" is not supported`);
            return false;
        }

        // Update state
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);

        // Load and apply translations
        translations = await loadTranslations(lang);
        applyTranslations();

        // Update URL without reloading
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);

        console.log('Language switched to:', lang);
        return true;
    }

    // Initialize language selector UI
    function initLanguageSelector() {
        const langBtn = document.getElementById('langBtn');
        const langSelector = document.querySelector('.lang-selector');
        const langDropdown = document.getElementById('langDropdown');

        if (!langBtn || !langSelector || !langDropdown) {
            console.warn('Language selector elements not found');
            return;
        }

        // Toggle dropdown on button click
        langBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            langSelector.classList.toggle('open');
        });

        // Handle language option clicks
        langDropdown.querySelectorAll('.lang-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const lang = this.getAttribute('data-lang');
                console.log('Language option clicked:', lang);

                if (lang) {
                    setLanguage(lang);
                }
                langSelector.classList.remove('open');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!langSelector.contains(e.target)) {
                langSelector.classList.remove('open');
            }
        });
    }

    // Initialize i18n
    async function init() {
        console.log('i18n initializing...');
        currentLang = getPreferredLang();
        console.log('Detected language:', currentLang);

        translations = await loadTranslations(currentLang);
        applyTranslations();
        initLanguageSelector();

        console.log('i18n initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API globally
    window.I18n = {
        setLanguage: setLanguage,
        getCurrentLang: function() { return currentLang; },
        translate: function(key) { return getNestedValue(translations, key); },
        getSupportedLangs: function() { return Object.keys(SUPPORTED_LANGS); }
    };
})();
