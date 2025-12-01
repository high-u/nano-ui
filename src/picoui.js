const createElement = (ns) => (tag, props = {}, ...children) => {
  const element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), value);
      return;
    }
    const finalValue = typeof value === 'function' ? value() : value;
    if (!ns && key in element) {
      element[key] = finalValue;
    } else {
      element.setAttribute(key, finalValue);
    }
  });
  element.append(...children);
  return element;
};

export const render = (createElements) => {
  let currentElement = null;

  return (...args) => {
    const result = createElements(...args);
    const normalized = Array.isArray(result) ? result : [result];

    if (!currentElement) {
      currentElement = normalized.length === 1 ? normalized[0] : normalized;
    } else {
      currentElement.replaceChildren(...normalized);
    }

    return currentElement;
  };
};

const makeTags = (ce) => new Proxy({}, {
  get: (_, tag) => (props = {}, ...children) => ce(tag, props, ...children)
});

export const tags = makeTags(createElement(''));
export const tagsSvg = makeTags(createElement('http://www.w3.org/2000/svg'));
