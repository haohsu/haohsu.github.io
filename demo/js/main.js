/**
 * Main JavaScript Module
 * Handles navigation, animations, form validation, and other interactions
 */

(function() {
    'use strict';

    // ============================================
    // Mobile Navigation
    // ============================================
    function initMobileNav() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const nav = document.getElementById('nav');

        if (!mobileMenuToggle || !nav) return;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            nav.classList.toggle('open');
            document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
        });

        // Close menu when clicking a nav link
        const navLinks = nav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                nav.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ============================================
    // Header Scroll Effect
    // ============================================
    function initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    // ============================================
    // Smooth Scroll for Anchor Links
    // ============================================
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ============================================
    // Number Counter Animation
    // ============================================
    function animateCounter(element, target, suffix = '') {
        const duration = 2000;
        const steps = 60;
        const stepDuration = duration / steps;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }

            // Format number
            let displayValue;
            if (target % 1 !== 0) {
                displayValue = current.toFixed(1);
            } else {
                displayValue = Math.floor(current);
            }

            element.textContent = displayValue;
        }, stepDuration);
    }

    function initCounterAnimations() {
        const counters = document.querySelectorAll('.stat-number[data-count]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const target = parseFloat(element.getAttribute('data-count'));
                    animateCounter(element, target);
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    // ============================================
    // Scroll Animations
    // ============================================
    function initScrollAnimations() {
        const animatedElements = document.querySelectorAll(
            '.service-card, .product-card, .advantage-item, .equipment-card, .stat-item'
        );

        animatedElements.forEach((el, index) => {
            el.classList.add('animate-on-scroll');
            el.style.transitionDelay = `${(index % 3) * 100}ms`;
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        animatedElements.forEach(el => observer.observe(el));
    }

    // ============================================
    // Form Validation and Submission
    // ============================================
    function initFormValidation() {
        const form = document.getElementById('quoteForm');
        const formMessage = document.getElementById('formMessage');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Basic validation
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });

            // Email validation
            const emailField = form.querySelector('[type="email"]');
            if (emailField && emailField.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailField.value)) {
                    isValid = false;
                    emailField.classList.add('error');
                }
            }

            if (!isValid) {
                showMessage('error', getFormMessage('validation'));
                return;
            }

            // Submit form
            const submitBtn = form.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = getFormMessage('submitting');

            try {
                const formData = new FormData(form);
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    showMessage('success', getFormMessage('success'));
                    form.reset();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showMessage('error', getFormMessage('error'));
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });

        function showMessage(type, message) {
            formMessage.className = 'form-message ' + type;
            formMessage.textContent = message;
            formMessage.style.display = 'block';

            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        }

        function getFormMessage(key) {
            const messages = {
                'zh-CN': {
                    validation: '请填写所有必填项',
                    submitting: '提交中...',
                    success: '提交成功！我们会尽快与您联系。',
                    error: '提交失败，请稍后重试或直接联系我们。'
                },
                'en': {
                    validation: 'Please fill in all required fields',
                    submitting: 'Submitting...',
                    success: 'Submitted successfully! We will contact you soon.',
                    error: 'Submission failed. Please try again or contact us directly.'
                },
                'ja': {
                    validation: '必須項目を入力してください',
                    submitting: '送信中...',
                    success: '送信成功！近日中にご連絡いたします。',
                    error: '送信に失敗しました。後でもう一度お試しください。'
                },
                'fr': {
                    validation: 'Veuillez remplir tous les champs obligatoires',
                    submitting: 'Envoi en cours...',
                    success: 'Envoyé avec succès ! Nous vous contacterons bientôt.',
                    error: 'Échec de l\'envoi. Veuillez réessayer ou nous contacter directement.'
                },
                'de': {
                    validation: 'Bitte füllen Sie alle Pflichtfelder aus',
                    submitting: 'Wird gesendet...',
                    success: 'Erfolgreich gesendet! Wir werden Sie bald kontaktieren.',
                    error: 'Senden fehlgeschlagen. Bitte versuchen Sie es erneut.'
                }
            };

            const lang = window.I18n ? window.I18n.getCurrentLang() : 'zh-CN';
            return messages[lang]?.[key] || messages['zh-CN'][key];
        }

        // Remove error class on input
        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('input', () => {
                field.classList.remove('error');
            });
        });
    }

    // ============================================
    // Lazy Loading Images
    // ============================================
    function initLazyLoading() {
        if ('loading' in HTMLImageElement.prototype) {
            // Browser supports native lazy loading
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        } else {
            // Fallback to Intersection Observer
            const images = document.querySelectorAll('img[data-src]');

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        observer.unobserve(img);
                    }
                });
            });

            images.forEach(img => observer.observe(img));
        }
    }

    // ============================================
    // Active Navigation Highlight
    // ============================================
    function initActiveNavHighlight() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                    });
                }
            });
        }, { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' });

        sections.forEach(section => observer.observe(section));
    }

    // ============================================
    // Initialize All Modules
    // ============================================
    function init() {
        initMobileNav();
        initHeaderScroll();
        initSmoothScroll();
        initCounterAnimations();
        initScrollAnimations();
        initFormValidation();
        initLazyLoading();
        initActiveNavHighlight();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
