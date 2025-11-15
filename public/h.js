/**
 * h.js - Hyperscript style DOM creation library
 * Simple function to create DOM elements with JSX-like syntax
 */

/**
 * Create a DOM element with hyperscript style
 * @param {string} tag - HTML tag name
 * @param {Object} props - Element properties (attributes, events, styles)
 * @param {...(Node|string|Array)} children - Child elements or text
 * @returns {HTMLElement} Created DOM element
 *
 * @example
 * h('div', { class: 'container' },
 *   h('span', { style: { color: 'red' } }, 'Hello'),
 *   'World'
 * )
 */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  // Set properties
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class' || key === 'className') {
      // Handle class
      if (Array.isArray(value)) {
        element.classList.add(...value.filter(Boolean));
      } else if (value) {
        element.classList.add(...value.split(' ').filter(Boolean));
      }
    } else if (key === 'style') {
      // Handle style object
      if (typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.style.cssText = value;
      }
    } else if (key.startsWith('on')) {
      // Handle events (onClick, onInput, etc.)
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (key === 'dataset') {
      // Handle dataset
      Object.assign(element.dataset, value);
    } else if (key in element) {
      // Set element property directly
      element[key] = value;
    } else {
      // Set as attribute
      element.setAttribute(key, value);
    }
  });

  // Append children
  const appendChildren = (parent, children) => {
    children.flat(Infinity).forEach(child => {
      if (child == null || child === false || child === true) {
        // Skip null, undefined, boolean
        return;
      } else if (child instanceof Node) {
        parent.appendChild(child);
      } else if (Array.isArray(child)) {
        appendChildren(parent, child);
      } else {
        parent.appendChild(document.createTextNode(String(child)));
      }
    });
  };

  appendChildren(element, children);

  return element;
}

/**
 * Create a text node
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
export function text(text) {
  return document.createTextNode(String(text));
}

/**
 * Create a document fragment with children
 * @param {...(Node|string|Array)} children - Child elements
 * @returns {DocumentFragment}
 */
export function fragment(...children) {
  const frag = document.createDocumentFragment();
  children.flat(Infinity).forEach(child => {
    if (child instanceof Node) {
      frag.appendChild(child);
    } else if (child != null && child !== false && child !== true) {
      frag.appendChild(document.createTextNode(String(child)));
    }
  });
  return frag;
}

// Export default as h for convenience
export default h;
