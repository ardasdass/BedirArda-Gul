class GiftGuideGrid extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.onClick.bind(this));
    this.onKeydown = this.onKeydown.bind(this);
  }

  connectedCallback() {
    document.addEventListener('keydown', this.onKeydown);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.onKeydown);
  }

  onClick(event) {
    const hotspot = event.target.closest('[data-gift-guide-hotspot]');
    if (hotspot) {
      this.openPopup(hotspot.dataset.popupId);
      return;
    }

    const closeButton = event.target.closest('[data-gift-guide-popup-close]');
    if (closeButton) {
      this.closePopup(closeButton.closest('.gift-guide-popup'));
      return;
    }

    const overlay = event.target.closest('.gift-guide-popup');
    if (overlay && event.target === overlay) {
      this.closePopup(overlay);
    }
  }

  onKeydown(event) {
    if (event.key !== 'Escape') return;
    const openPopup = this.querySelector('.gift-guide-popup:not([hidden])');
    if (openPopup) this.closePopup(openPopup);
  }

  openPopup(id) {
    const popup = document.getElementById(id);
    if (!popup) return;
    popup.hidden = false;
    popup.querySelector('[data-gift-guide-popup-close]')?.focus();
  }

  closePopup(popup) {
    if (!popup) return;
    popup.hidden = true;
  }
}

customElements.define('gift-guide-grid', GiftGuideGrid);

class GiftGuideProductPopup extends HTMLElement {
  constructor() {
    super();

    this.productData = JSON.parse(this.querySelector('[data-gift-guide-product-json]').textContent);
    this.variantPrices = JSON.parse(this.querySelector('[data-gift-guide-variant-prices]').textContent);
    this.selectedOptions = this.getInitialOptions();

    this.optionButtons = Array.from(this.querySelectorAll('[data-gift-guide-option]'));
    this.triggerButtons = Array.from(this.querySelectorAll('.gift-guide-popup__trigger-option'));
    this.sizeButtons = Array.from(this.querySelectorAll('[data-gift-guide-size-option]'));
    this.sizeDetails = this.querySelector('[data-gift-guide-size-select]');
    this.sizeSummary = this.querySelector('[data-gift-guide-size-current]');
    this.addToCartButton = this.querySelector('[data-gift-guide-add-to-cart]');
    this.priceElement = this.querySelector('[data-gift-guide-popup-price]');
    this.imageElement = this.querySelector('[data-gift-guide-popup-image]');

    this.triggerButtons.forEach((button) => button.addEventListener('click', this.onTriggerClick.bind(this)));
    this.sizeButtons.forEach((button) => button.addEventListener('click', this.onSizeClick.bind(this)));
    this.addToCartButton?.addEventListener('click', this.onAddToCart.bind(this));

    this.updateVariantState();
  }

  getInitialOptions() {
    const variant =
      this.productData.variants.find((candidate) => candidate.available) || this.productData.variants[0];
    const options = variant ? [...variant.options] : [];
    const sizeIndex = Number(this.querySelector('gift-guide-size-options')?.dataset.optionIndex);

    if (Number.isInteger(sizeIndex)) options[sizeIndex] = null;
    return options;
  }

  findVariant(options) {
    return this.productData.variants.find((variant) =>
      variant.options.every((value, index) => options[index] == null || value === options[index])
    );
  }

  onTriggerClick(event) {
    const button = event.currentTarget;
    if (button.disabled) return;

    const index = Number(button.dataset.optionIndex);
    this.selectedOptions[index] = button.dataset.value;

    this.triggerButtons
      .filter((candidate) => Number(candidate.dataset.optionIndex) === index)
      .forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));

    this.updateVariantState();
  }

  onSizeClick(event) {
    const button = event.currentTarget;
    if (button.disabled) return;

    const index = Number(button.dataset.optionIndex);
    this.selectedOptions[index] = button.dataset.value;

    this.sizeButtons.forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
    if (this.sizeSummary) this.sizeSummary.textContent = button.dataset.value;
    if (this.sizeDetails) this.sizeDetails.open = false;

    this.updateVariantState();
  }

  updateVariantState() {
    const hasUnselectedOption = this.selectedOptions.some((value) => value == null);
    const variant = hasUnselectedOption ? null : this.findVariant(this.selectedOptions);
    this.currentVariant = variant;

    if (this.priceElement && variant) {
      this.priceElement.textContent = this.variantPrices[variant.id] || this.priceElement.textContent;
    }

    if (this.imageElement && variant?.featured_image?.src) {
      this.imageElement.src = variant.featured_image.src;
    }

    this.optionButtons.forEach((button) => {
      const index = Number(button.dataset.optionIndex);
      const testOptions = [...this.selectedOptions];
      testOptions[index] = button.dataset.value;
      const hasAvailableMatch = this.productData.variants.some(
        (candidate) =>
          candidate.available &&
          candidate.options.every((value, optionIndex) => testOptions[optionIndex] == null || value === testOptions[optionIndex])
      );
      button.disabled = !hasAvailableMatch;
    });

    if (this.addToCartButton) {
      const textElement = this.querySelector('[data-gift-guide-add-to-cart-text]');
      const available = Boolean(variant && variant.available);
      this.addToCartButton.disabled = !available;
      if (textElement) {
        textElement.textContent = available
          ? this.addToCartButton.dataset.addText
          : this.addToCartButton.dataset.soldOutText;
      }
    }
  }

  async onAddToCart() {
    if (!this.currentVariant || this.addToCartButton.disabled) return;

    const items = [{ id: this.currentVariant.id, quantity: 1 }];

    const bundle = window.giftGuideBundleRule;
    if (bundle?.triggerOptions?.length && bundle.variantId !== this.currentVariant.id) {
      const values = this.currentVariant.options.map((value) => (value || '').trim().toLowerCase());
      const matchesTrigger = bundle.triggerOptions.every((value) => values.includes(value.trim().toLowerCase()));
      if (matchesTrigger) items.push({ id: bundle.variantId, quantity: 1 });
    }

    this.addToCartButton.disabled = true;

    try {
      const response = await fetch(window.routes.cart_add_url, {
        ...fetchConfig(),
        body: JSON.stringify({ items }),
      });

      if (!response.ok) throw new Error('Add to cart request failed');

      document.dispatchEvent(new CustomEvent('gift-guide:cart-add', { detail: { items } }));
    } catch (error) {
      console.error(error);
    } finally {
      this.updateVariantState();
    }
  }
}

customElements.define('gift-guide-product-popup', GiftGuideProductPopup);
