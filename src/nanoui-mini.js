const makeH = (ns) => (tag, props = {}, ...children) => {
  const element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
      element.setAttribute('data-has-event', 'true');
      return;
    }
    const finalValue = typeof value === 'function' ? value() : value;
    if (!ns && key in element) {
      element[key] = finalValue;
    } else {
      element.setAttribute(key, finalValue);
    }
  });
  const appendChildren = (parent, kids) => {
    kids.flat(Infinity).forEach(child => {
      if (child instanceof Node) {
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
};

const h = makeH(null);
const hSvg = makeH('http://www.w3.org/2000/svg');

const attributesEqual = (oldEl, newEl) => {
  const oldAttrs = oldEl.attributes;
  const newAttrs = newEl.attributes;
  if (oldAttrs.length !== newAttrs.length) return false;
  for (let i = 0; i < oldAttrs.length; i++) {
    const attr = oldAttrs[i];
    if (newEl.getAttribute(attr.name) !== attr.value) return false;
  }
  return true;
};

const hasEvent = (el) => el?.getAttribute?.('data-has-event') === 'true';

const hasMixedContent = (el) => {
  let hasText = false;
  let hasElement = false;
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) hasElement = true;
    if (node.nodeType === Node.TEXT_NODE && node.textContent !== '') hasText = true;
  });
  return hasText && hasElement;
};

const isFormLike = (el) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLOptionElement;

const shouldReplace = (existing, newEl) => {
  if (!existing) return true;
  if (hasMixedContent(newEl) || hasMixedContent(existing)) return true;
  if (existing.tagName !== newEl.tagName) return true;
  if (hasEvent(newEl) || hasEvent(existing)) return true;
  if (isFormLike(newEl) || isFormLike(existing)) return true;
  if (!attributesEqual(existing, newEl)) return true;
  return false;
};

export const render = (container, createElements) => {
  const patchTree = (parent, newChildren) => {
    const oldChildren = Array.from(parent.children);
    newChildren.forEach((newChild, index) => {
      const existing = oldChildren[index];
      if (shouldReplace(existing, newChild)) {
        const mixedContent = hasMixedContent(newChild) || (existing && hasMixedContent(existing));
        if (existing && !mixedContent) {
          patchTree(existing, Array.from(newChild.children));
          newChild.replaceChildren();
          newChild.append(...Array.from(existing.childNodes));
        }
        const target = parent.children[index];
        if (target) {
          target.replaceWith(newChild);
        } else {
          parent.appendChild(newChild);
        }
      } else {
        if (parent.children[index] !== existing) {
          parent.insertBefore(existing, parent.children[index] || null);
        }
        const isTextOnly = existing.children.length === 0 && newChild.children.length === 0;
        if (isTextOnly) {
          if (existing.textContent !== newChild.textContent) {
            existing.textContent = newChild.textContent;
          }
        } else {
          patchTree(existing, Array.from(newChild.children));
        }
      }
    });
    while (parent.children.length > newChildren.length) {
      parent.removeChild(parent.lastElementChild ?? parent.lastChild);
    }
  };
  return (...args) => {
    const newElements = createElements(...args);
    const normalized = Array.isArray(newElements) ? newElements : [newElements];
    patchTree(container, normalized);
  };
};

const makeTags = (hFn) => new Proxy({}, {
  get: (_, tag) => (props = {}, ...children) => hFn(tag, props, ...children)
});

export const tags = makeTags(h);
export const tagsSvg = makeTags(hSvg);
