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
    if (attr.name.startsWith('on')) continue;
    if (newEl.getAttribute(attr.name) !== attr.value) return false;
  }

  return true;
};

/**
 * Get key from element (id attribute)
 */
const getKey = (el) => el.id;

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

    return (...args) => {
      const newElements = createElements(...args);
      const usedKeys = new Set();

    // ツリーをパッチ
    const patchTree = (parent, newChildren) => {
      const currentKeys = new Set();

      newChildren.forEach((newChild, index) => {
        const key = getKey(newChild);
        if (key) {
          currentKeys.add(key);
          usedKeys.add(key);
        }

        const existingRef = key ? elementRefs.get(key) : null;

        if (existingRef) {
          // タグが違う場合は newChild を使用
          if (existingRef.tagName !== newChild.tagName) {
            console.log('タグ変更（再作成）:', key);

            // 古い要素を DOM から削除
            if (existingRef.parentNode) {
              existingRef.parentNode.removeChild(existingRef);
            }

            const newChildChildren = Array.from(newChild.children);
            // newChild.innerHTML = '';

            const targetPosition = parent.children[index];
            if (targetPosition) {
              parent.insertBefore(newChild, targetPosition);
            } else {
              parent.appendChild(newChild);
            }
            elementRefs.set(key, newChild);
            patchTree(newChild, newChildChildren);
            return;
          }

          // 属性が違う場合は newChild を使用、子孫は再利用
          if (!attributesEqual(existingRef, newChild)) {
            console.log('属性変更（再作成）:', key);

            // 古い要素を DOM から削除
            if (existingRef.parentNode) {
              existingRef.parentNode.removeChild(existingRef);
            }

            const newChildChildren = Array.from(newChild.children);
            // newChild.innerHTML = '';

            const targetPosition = parent.children[index];
            if (targetPosition) {
              parent.insertBefore(newChild, targetPosition);
            } else {
              parent.appendChild(newChild);
            }
            elementRefs.set(key, newChild);
            patchTree(newChild, newChildChildren);
            return;
          }

          // 位置調整（親の付け替え含む）
          const targetPosition = parent.children[index];
          if (existingRef.parentNode !== parent || targetPosition !== existingRef) {
            if (targetPosition) {
              parent.insertBefore(existingRef, targetPosition);
            } else {
              parent.appendChild(existingRef);
            }
          }

          // テキスト更新
          if (existingRef.children.length === 0 && newChild.children.length === 0) {
            if (existingRef.textContent !== newChild.textContent) {
              existingRef.textContent = newChild.textContent;
            }
          } else {
            patchTree(existingRef, Array.from(newChild.children));
          }
        } else {
          // 新規作成
          console.log('新規作成:', key);
          const targetPosition = parent.children[index];
          if (targetPosition) {
            parent.insertBefore(newChild, targetPosition);
          } else {
            parent.appendChild(newChild);
          }
          // 参照を保存（子孫も含めて再帰的に）
          const saveRefs = (el) => {
            const k = getKey(el);
            if (k) {
              elementRefs.set(k, el);
              usedKeys.add(k);
            }
            Array.from(el.children).forEach(saveRefs);
          };
          saveRefs(newChild);
        }
      });

      // 不要な直接の子要素を削除（DOMからのみ）
      Array.from(parent.children).forEach(child => {
        const key = getKey(child);
        if (key && !currentKeys.has(key)) {
          child.remove();
        }
      });
    };

    patchTree(container, newElements);

    // 使われなかった参照を削除
    elementRefs.forEach((_, key) => {
      if (!usedKeys.has(key)) {
        elementRefs.delete(key);
      }
    });
  };
};

// Export default as h for convenience
export default h;
