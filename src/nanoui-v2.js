/**
 * nano-ui - Minimal hyperscript style DOM creation library
 * Simple function to create DOM elements with JSX-like syntax
 */

/**
 * Create a DOM element with hyperscript style
 * @param {string} tag - HTML tag name
 * @param {string|undefined} key - Unique key for the element (for educational purposes)
 * @param {Object} props - Element properties (attributes, events, styles)
 * @param {...(Node|string|Array)} children - Child elements or text
 * @returns {HTMLElement} Created DOM element
 *
 * @example
 * h('div', 'unique-key', { class: 'container' },
 *   h('span', 'span-key', { style: 'color: red' }, 'Hello'),
 *   'World'
 * )
 */
export const h = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);

  // Set properties
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      // Handle events (onClick, onInput, etc.)
      element.addEventListener(key.slice(2).toLowerCase(), value);
      element.setAttribute('data-has-event', 'true');
    } else {
      // 関数の場合は実行して値を取得
      const finalValue = typeof value === 'function' ? value() : value;
      
      // Set element property or attribute
      if (key in element) {
        element[key] = finalValue;
      } else {
        element.setAttribute(key, finalValue);
      }
    }
  });

  // Append children
  const appendChildren = (parent, children) => {
    children.flat(Infinity).forEach(child => {
      
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

/**
 * Check if two elements have the same attributes
 */
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

/**
 * Get key from element (data-key attribute)
 */
const getKey = (el) => el.getAttribute('data-key');

  /**
   * Create a diff renderer for efficient list rendering
   * @param {HTMLElement} container - Container element to render into
   * @param {Function} createElements - Function that creates elements (will receive renderer arguments)
   * @returns {Function} Renderer function that accepts arguments to pass to createElements
   *
   * @example
   * const renderer = render(container, (data, options) => {
   *   return h('div', {}, `Hello ${data.name}, count: ${options.count}`);
   * });
   * 
   * // レンダラー実行時に引数を渡す
   * renderer({ name: 'World' }, { count: 42 });
   */
  export const render = (container, createElements) => {
    // 前回DOMに追加した要素への参照を保持
    const elementRefs = new Map();
    const noKeyElements = [];  // keyなし要素の配列

    return (...args) => {
      const newElements = createElements(...args);
      const usedKeys = new Set();
      const newNoKeyElements = [];  // 今回追加されたkeyなし要素

    // ツリーをパッチ
    const patchTree = (parent, newChildren) => {
      const currentKeys = new Set();

      // ヘルパー: 新しい要素を挿入して参照を保存
      const insertNewElement = (newEl, index, shouldRemoveOld = null) => {
        // 古い要素を削除
        shouldRemoveOld?.parentNode?.removeChild(shouldRemoveOld);

        // 新しい要素を挿入
        const targetPosition = parent.children[index];
        if (targetPosition) {
          parent.insertBefore(newEl, targetPosition);
        } else {
          parent.appendChild(newEl);
        }

        // 自分だけの参照を保存
        const k = getKey(newEl);
        if (k) {
          elementRefs.set(k, newEl);
          usedKeys.add(k);
        } else {
          newNoKeyElements.push(newEl);
        }

        // 子要素はpatchTreeで再帰処理
        patchTree(newEl, Array.from(newEl.children));
      };

      newChildren.forEach((newChild, index) => {
        const key = getKey(newChild);
        if (key) {
          currentKeys.add(key);
          usedKeys.add(key);
        }

        const existingRef = key ? elementRefs.get(key) : null;

        // 新規作成 or タグ変更 or 属性変更 → 新しい要素を挿入
        if (!existingRef ||
            existingRef.tagName !== newChild.tagName ||
            !attributesEqual(existingRef, newChild)) {

          const reason = !existingRef ? '新規作成:' :
                         existingRef.tagName !== newChild.tagName ? 'タグ変更（再作成）:' :
                         '属性変更（再作成）:';
          console.log(reason, key);

          insertNewElement(newChild, index, existingRef);
          return;
        }

        // 既存要素を再利用 - 位置調整
        const targetPosition = parent.children[index];
        if (existingRef.parentNode !== parent || targetPosition !== existingRef) {
          if (targetPosition) {
            parent.insertBefore(existingRef, targetPosition);
          } else {
            parent.appendChild(existingRef);
          }
        }

        // テキスト更新 or 子要素の再帰処理
        if (existingRef.children.length === 0 && newChild.children.length === 0) {
          if (existingRef.textContent !== newChild.textContent) {
            existingRef.textContent = newChild.textContent;
          }
        } else {
          patchTree(existingRef, Array.from(newChild.children));
        }
      });

      // 不要な子要素を削除
      Array.from(parent.children).forEach(child => {
        const key = getKey(child);
        if (key && !currentKeys.has(key)) {
          child.remove();
        }
      });
    };

    patchTree(container, newElements);

    // 古いkeyなし要素を削除
    noKeyElements.forEach(el => {
      if (el.parentNode) {
        el.remove();
      }
    });

    // keyなし要素の配列を更新
    noKeyElements.length = 0;
    noKeyElements.push(...newNoKeyElements);

    // 使われなかった参照を削除
    elementRefs.forEach((_, key) => {
      if (!usedKeys.has(key)) {
        elementRefs.delete(key);
      }
    });
  };
};

// Proxy-based tags object (VanJS style)
export const tags = new Proxy({}, {
  get: (_, tag) => {
    if (tag === 'svg') {
      // svgの場合は文字列をパースして返す
      return (svgString) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        return doc.documentElement;
      };
    }
    return (props = {}, ...children) => h(tag, props, ...children);
  }
});

// Export default as h for convenience
export default h;
