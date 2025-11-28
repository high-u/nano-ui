const makeH = (ns) => (tag, props = {}, ...children) => {
  const element = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
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

export const render = (container, createElements) => {
  return (...args) => {
    const result = createElements(...args);
    const normalized = Array.isArray(result) ? result.flat(Infinity) : [result];
    container.replaceChildren(...normalized);
  };
};

const makeTags = (hFn) => new Proxy({}, {
  get: (_, tag) => (props = {}, ...children) => hFn(tag, props, ...children)
});

export const tags = makeTags(h);
export const tagsSvg = makeTags(hSvg);
