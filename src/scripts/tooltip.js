import '../assets/style.css'


const DEFAULT_TOOLTIP_CLASS = 'tooltip-custom';

class Tooltip {
  constructor({ root, element = null, className = DEFAULT_TOOLTIP_CLASS, attributes = {} } = {}) {
    if (!root) throw new Error('Tooltip root element is required');
    this.root = root;
    this.element = element ?? document.createElement('div');

    if (!element) {
      this.element.className = className;
      root.appendChild(this.element);
    } else if (className) {
      this.element.className = className;
    }

    this.element.classList.add('hidden');

    for (const [key, value] of Object.entries(attributes)) {
      this.element.setAttribute(key, value);
    }
  }

  showHtml(html) {
    this.element.innerHTML = html;
    this.element.classList.remove('hidden');
    return this;
  }

  show() {
    this.element.classList.remove('hidden');
    return this;
  }

  showText(text) {
    this.element.textContent = text;
    this.element.classList.remove('hidden');
    return this;
  }

  setHtml(html) {
    this.element.innerHTML = html;
    return this;
  }

  setText(text) {
    this.element.textContent = text;
    return this;
  }

  hide() {
    this.element.classList.add('hidden');
    return this;
  }

  setPosition(x, y) {
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    return this;
  }
}

export { Tooltip, DEFAULT_TOOLTIP_CLASS };
