// Minimal Web UI core (ESM)
const H_KEY = Symbol('key');
const H_INIT = Symbol('init');
const H_CACHE = Symbol('keyCache');

function h(tag, key, attrs, childFn, init) {
  const el = document.createElement(tag);
  if (key != null) el[H_KEY] = key;
  if (attrs) {
    const { on, ...rest } = attrs;
    for (const [k, v] of Object.entries(rest)) {
      if (v === true) el.setAttribute(k, '');
      else if (v === false || v == null) el.removeAttribute(k);
      else el.setAttribute(k, String(v));
    }
    if (on && typeof on === 'object') {
      for (const [type, handler] of Object.entries(on)) {
        if (typeof handler === 'function') el.addEventListener(type, handler);
      }
    }
  }
  const toNode = (x) => (x instanceof Node ? x : document.createTextNode(String(x)));
  el[H_INIT] = init;
  Object.defineProperty(el, 'render', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: (arg) => {
      const a = arguments.length === 0 ? init : arg;
      const out = typeof childFn === 'function' ? childFn(a, el) : undefined;
      const arr = out == null ? [] : Array.isArray(out) ? out : [out];
      const prevCache = el[H_CACHE] instanceof Map ? el[H_CACHE] : undefined;
      const nextCache = new Map();
      const newNodes = arr.map((item) => {
        if (item instanceof Node && item[H_KEY] != null) {
          const k = item[H_KEY];
          const prev = prevCache ? prevCache.get(k) : undefined;
          if (prev && prev instanceof Node) {
            if (typeof prev.render === 'function') prev.render(item[H_INIT]);
            nextCache.set(k, prev);
            return prev;
          }
          nextCache.set(k, item);
          return item;
        }
        return toNode(item);
      });
      if (nextCache.size > 0) el[H_CACHE] = nextCache;
      const nextSet = new Set(newNodes);
      for (const node of Array.from(el.childNodes)) {
        if (!nextSet.has(node)) el.removeChild(node);
      }
      let i = 0;
      for (const node of newNodes) {
        const ref = el.childNodes[i] || null;
        if (ref !== node) el.insertBefore(node, ref);
        i++;
      }
    },
  });
  el.render(init);
  return el;
}

function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    update: (fn) => {
      state = fn(state);
      subs.forEach((fn) => fn(state));
    },
    subscribe: (fn) => {
      subs.add(fn);
      fn(state);
      return () => subs.delete(fn);
    },
  };
}

function bind(el, store, select = (s) => s) {
  return store.subscribe((s) => {
    el.render(select(s));
  });
}

export { h, createStore, bind };
