/**
 * nano-ui - Minimal hyperscript style DOM creation library
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
 *   h('span', { style: 'color: red' }, 'Hello'),
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
      if (child == null || child === false || child === true) return;
      
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
 * Create a diff renderer for efficient list rendering or single element replacement
 * @param {Object} options - Renderer options
 * @param {HTMLElement} options.container - Parent element to render into
 * @param {Function} [options.keySelector] - Function to get unique key from item (for arrays)
 * @param {Function} options.createElement - Function to create element from item
 * @returns {Function} Render function
 *
 * @example
 * // For arrays (with keySelector)
 * const renderTasks = render({
 *   container: taskList,
 *   keySelector: item => item.id,
 *   createElement: createTaskElement
 * });
 * renderTasks(tasks);
 * 
 * // For single elements (without keySelector)
 * const renderCounter = render({
 *   container: counterDiv,
 *   createElement: () => h('span', {}, String(count))
 * });
 * renderCounter();
 */
export const render = ({ container, keySelector, createElement }) => {
  // keySelector がある場合は配列用の処理
  if (keySelector) {
    const elementMap = new Map();      // key → element
    const valueMap = new Map();        // key → JSON文字列
    
    return (items) => {
      // 不要な要素を削除
      const currentKeys = new Set(items.map(keySelector));
      elementMap.forEach((element, key) => {
        if (!currentKeys.has(key)) {
          element.remove();
          elementMap.delete(key);
          valueMap.delete(key);
        }
      });
      
      // 各アイテムを処理
      items.forEach((item, index) => {
        const key = keySelector(item);
        const jsonValue = JSON.stringify(item);
        let element = elementMap.get(key);
        const oldValue = valueMap.get(key);
        
        if (!element) {
          // 新規作成
          element = createElement(item);
          elementMap.set(key, element);
          valueMap.set(key, jsonValue);
        } else if (oldValue !== jsonValue) {
          // 値が変わったら更新
          const newElement = createElement(item);
          element.parentNode.replaceChild(newElement, element);
          elementMap.set(key, newElement);
          valueMap.set(key, jsonValue);
          element = newElement;
        }
        
        // 位置調整
        const targetPosition = container.children[index];
        if (targetPosition !== element) {
          container.insertBefore(element, targetPosition);
        }
      });
    };
  }
  
  // keySelector がない場合は単一要素用の処理
  return (item) => {
    const newElement = createElement(item);
    container.innerHTML = '';
    container.appendChild(newElement);
  };
};

// Export default as h for convenience
export default h;
