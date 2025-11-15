/**
 * fluent.js - Fluent/Chainable DOM Builder Library
 * Create DOM elements with a fluent API
 */

class FluentElement {
  /**
   * @param {string|HTMLElement} tagOrElement - Tag name or existing element
   */
  constructor(tagOrElement) {
    if (typeof tagOrElement === 'string') {
      this.element = document.createElement(tagOrElement);
    } else {
      this.element = tagOrElement;
    }
  }

  /**
   * Add CSS class(es)
   * @param {...string} classNames - Class names to add
   * @returns {FluentElement}
   */
  class(...classNames) {
    this.element.classList.add(...classNames.flat().filter(Boolean));
    return this;
  }

  /**
   * Remove CSS class(es)
   * @param {...string} classNames - Class names to remove
   * @returns {FluentElement}
   */
  removeClass(...classNames) {
    this.element.classList.remove(...classNames.flat().filter(Boolean));
    return this;
  }

  /**
   * Toggle CSS class
   * @param {string} className - Class name to toggle
   * @param {boolean} force - Force add/remove
   * @returns {FluentElement}
   */
  toggleClass(className, force) {
    this.element.classList.toggle(className, force);
    return this;
  }

  /**
   * Set inline styles
   * @param {Object|string} styles - Style object or CSS text
   * @returns {FluentElement}
   */
  style(styles) {
    if (typeof styles === 'object') {
      Object.assign(this.element.style, styles);
    } else {
      this.element.style.cssText = styles;
    }
    return this;
  }

  /**
   * Set text content
   * @param {string} content - Text content
   * @returns {FluentElement}
   */
  text(content) {
    this.element.textContent = content;
    return this;
  }

  /**
   * Set HTML content
   * @param {string} html - HTML content
   * @returns {FluentElement}
   */
  html(html) {
    this.element.innerHTML = html;
    return this;
  }

  /**
   * Set attribute
   * @param {string|Object} name - Attribute name or object of attributes
   * @param {string} value - Attribute value
   * @returns {FluentElement}
   */
  attr(name, value) {
    if (typeof name === 'object') {
      Object.entries(name).forEach(([key, val]) => {
        this.element.setAttribute(key, val);
      });
    } else {
      this.element.setAttribute(name, value);
    }
    return this;
  }

  /**
   * Remove attribute
   * @param {string} name - Attribute name
   * @returns {FluentElement}
   */
  removeAttr(name) {
    this.element.removeAttribute(name);
    return this;
  }

  /**
   * Set property
   * @param {string|Object} name - Property name or object of properties
   * @param {*} value - Property value
   * @returns {FluentElement}
   */
  prop(name, value) {
    if (typeof name === 'object') {
      Object.assign(this.element, name);
    } else {
      this.element[name] = value;
    }
    return this;
  }

  /**
   * Set dataset
   * @param {string|Object} name - Data attribute name or object
   * @param {string} value - Data attribute value
   * @returns {FluentElement}
   */
  data(name, value) {
    if (typeof name === 'object') {
      Object.assign(this.element.dataset, name);
    } else {
      this.element.dataset[name] = value;
    }
    return this;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {FluentElement}
   */
  on(event, handler, options) {
    this.element.addEventListener(event, handler, options);
    return this;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {FluentElement}
   */
  off(event, handler) {
    this.element.removeEventListener(event, handler);
    return this;
  }

  /**
   * Append child elements
   * @param {...(Node|FluentElement|string|Array)} children - Children to append
   * @returns {FluentElement}
   */
  append(...children) {
    children.flat(Infinity).forEach(child => {
      if (child == null || child === false || child === true) {
        return;
      } else if (child instanceof FluentElement) {
        this.element.appendChild(child.element);
      } else if (child instanceof Node) {
        this.element.appendChild(child);
      } else {
        this.element.appendChild(document.createTextNode(String(child)));
      }
    });
    return this;
  }

  /**
   * Prepend child elements
   * @param {...(Node|FluentElement|string|Array)} children - Children to prepend
   * @returns {FluentElement}
   */
  prepend(...children) {
    children.flat(Infinity).reverse().forEach(child => {
      if (child == null || child === false || child === true) {
        return;
      } else if (child instanceof FluentElement) {
        this.element.prepend(child.element);
      } else if (child instanceof Node) {
        this.element.prepend(child);
      } else {
        this.element.prepend(document.createTextNode(String(child)));
      }
    });
    return this;
  }

  /**
   * Replace all children
   * @param {...(Node|FluentElement|string|Array)} children - New children
   * @returns {FluentElement}
   */
  replaceChildren(...children) {
    const nodes = children.flat(Infinity).map(child => {
      if (child == null || child === false || child === true) {
        return null;
      } else if (child instanceof FluentElement) {
        return child.element;
      } else if (child instanceof Node) {
        return child;
      } else {
        return document.createTextNode(String(child));
      }
    }).filter(Boolean);

    this.element.replaceChildren(...nodes);
    return this;
  }

  /**
   * Empty all children
   * @returns {FluentElement}
   */
  empty() {
    this.element.replaceChildren();
    return this;
  }

  /**
   * Remove element from DOM
   * @returns {FluentElement}
   */
  remove() {
    this.element.remove();
    return this;
  }

  /**
   * Get the underlying DOM element
   * @returns {HTMLElement}
   */
  get() {
    return this.element;
  }

  /**
   * Mount element to target
   * @param {HTMLElement|string} target - Target element or selector
   * @returns {FluentElement}
   */
  mount(target) {
    const targetElement = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (targetElement) {
      targetElement.appendChild(this.element);
    }
    return this;
  }
}

/**
 * Create a new FluentElement
 * @param {string|HTMLElement} tagOrElement - Tag name or existing element
 * @returns {FluentElement}
 *
 * @example
 * create('div')
 *   .class('container')
 *   .style({ padding: '10px' })
 *   .append(
 *     create('span').text('Hello')
 *   )
 *   .mount(document.body);
 */
export function create(tagOrElement) {
  return new FluentElement(tagOrElement);
}

/**
 * Wrap an existing element
 * @param {HTMLElement|string} elementOrSelector - Element or selector
 * @returns {FluentElement}
 */
export function wrap(elementOrSelector) {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector;

  return new FluentElement(element);
}

// Export the class for advanced usage
export { FluentElement };

// Export default as create for convenience
export default create;
