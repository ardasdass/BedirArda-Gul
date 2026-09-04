class GiftGuideBanner {
  constructor(element) {
    this.element = element;
    this.toggle = element.querySelector('[data-gift-guide-menu-toggle]');
    this.panel = element.querySelector('[data-gift-guide-menu-panel]');

    this.toggle?.addEventListener('click', () => this.toggleMenu());
  }

  toggleMenu() {
    if (!this.toggle || !this.panel) return;

    const isOpen = this.toggle.getAttribute('aria-expanded') === 'true';
    this.toggle.setAttribute('aria-expanded', String(!isOpen));
    this.toggle.setAttribute('aria-label', isOpen ? 'Menu' : 'Close menu');
    this.panel.hidden = isOpen;
    this.element.classList.toggle('is-menu-open', !isOpen);
  }
}

document.querySelectorAll('[data-gift-guide-banner]').forEach((element) => new GiftGuideBanner(element));