let currentRenderContext = null;

const applyEvents = (element, props) => {
  const prev = element.__nanoEvents || {};
  const next = {};

  Object.entries(props).forEach(([key, value]) => {
    if (!key.startsWith('on')) return;
    const eventName = key.slice(2).toLowerCase();
    const handler = value;
    if (prev[eventName] !== handler) {
      if (prev[eventName]) element.removeEventListener(eventName, prev[eventName]);
      if (handler) element.addEventListener(eventName, handler);
    }
    if (handler) next[eventName] = handler;
  });

  Object.keys(prev).forEach(eventName => {
    if (!next[eventName]) {
      element.removeEventListener(eventName, prev[eventName]);
    }
  });

  element.__nanoEvents = next;
};

const applyProps = (element, props, ns) => {
  applyEvents(element, props);

  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) return;
    const finalValue = typeof value === 'function' ? value() : value;
    if (!ns && key in element) {
      element[key] = finalValue;
    } else {
      element.setAttribute(key, finalValue);
    }
  });

  Array.from(element.attributes).forEach(attr => {
    if (attr.name.startsWith('on')) return;
    if (!(attr.name in props)) {
      element.removeAttribute(attr.name);
    }
  });
};

const takeExistingElement = (tag, ns, key) => {
  const ctx = currentRenderContext;
  if (!ctx) return null;

  if (key != null && ctx.keyMap) {
    const found = ctx.keyMap.get(String(key));
    if (found && found.tagName.toLowerCase() === tag.toLowerCase() && found.namespaceURI === ns) {
      ctx.keyMap.delete(String(key));
      return found;
    }
  }

  while (ctx.cursor < ctx.prevNodes.length) {
    const candidate = ctx.prevNodes[ctx.cursor++];
    if (candidate.nodeType === Node.ELEMENT_NODE &&
        candidate.tagName.toLowerCase() === tag.toLowerCase() &&
        candidate.namespaceURI === ns) {
      return candidate;
    }
  }

  return null;
};

const reconcileChildren = (parent, children) => {
  const keep = new Set(children);
  Array.from(parent.childNodes).forEach(node => {
    if (!keep.has(node)) parent.removeChild(node);
  });

  let cursor = parent.firstChild;
  children.forEach(child => {
    if (child === cursor) {
      cursor = cursor ? cursor.nextSibling : null;
    } else {
      parent.insertBefore(child, cursor);
    }
  });
};

const makeH = (ns) => (tag, props = {}, ...children) => {
  const key = props?.key ?? null;
  const existing = takeExistingElement(tag, ns, key);
  const element = existing || (ns ? document.createElementNS(ns, tag) : document.createElement(tag));

  applyProps(element, props, ns);

  const prevNodes = Array.from(element.childNodes);
  const keyMap = new Map();
  prevNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const nodeKey = node.getAttribute('key');
      if (nodeKey != null) keyMap.set(nodeKey, node);
    }
  });

  const childContext = { prevNodes, cursor: 0, keyMap };
  const parentContext = currentRenderContext;
  currentRenderContext = childContext;

  const builtChildren = [];
  const pushChild = (child) => {
    if (child instanceof Node) {
      builtChildren.push(child);
      return;
    }
    if (Array.isArray(child)) {
      child.flat(Infinity).forEach(pushChild);
      return;
    }
    const text = String(child);
    let textNode = null;
    while (childContext.cursor < childContext.prevNodes.length) {
      const candidate = childContext.prevNodes[childContext.cursor++];
      if (candidate.nodeType === Node.TEXT_NODE) {
        textNode = candidate;
        break;
      }
      if (candidate.nodeType === Node.ELEMENT_NODE && candidate.getAttribute('key')) {
        continue;
      }
    }
    if (!textNode) {
      textNode = document.createTextNode(text);
    } else if (textNode.textContent !== text) {
      textNode.textContent = text;
    }
    builtChildren.push(textNode);
  };

  children.flat(Infinity).forEach(pushChild);

  currentRenderContext = parentContext;

  reconcileChildren(element, builtChildren);

  return element;
};

const h = makeH(null);
const hSvg = makeH('http://www.w3.org/2000/svg');

export const render = (container, createElements) => {
  let initialized = false;
  let prevChildren = [];

  return (...args) => {
    const ctx = { prevNodes: prevChildren, cursor: 0, keyMap: new Map() };
    prevChildren.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const nodeKey = node.getAttribute('key');
        if (nodeKey != null) ctx.keyMap.set(nodeKey, node);
      }
    });

    const parentContext = currentRenderContext;
    currentRenderContext = ctx;

    const result = createElements(...args);
    const normalized = Array.isArray(result) ? result.flat(Infinity) : [result];

    currentRenderContext = parentContext;

    reconcileChildren(container, normalized);
    prevChildren = Array.from(container.childNodes);

    if (!initialized) initialized = true;
  };
};

const makeTags = (hFn) => new Proxy({}, {
  get: (_, tag) => (props = {}, ...children) => hFn(tag, props, ...children)
});

export const tags = makeTags(h);
export const tagsSvg = makeTags(hSvg);
