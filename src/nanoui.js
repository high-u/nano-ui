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

export const render = (container, createElement) => {
  const elementMap = new Map();  // key → element
  
  return (data) => {
    if (Array.isArray(data)) {
      // 1. 先に削除処理
      elementMap.forEach((element, key) => {
        if (!data.some(item => JSON.stringify(item) === key)) {
          element.remove();
          elementMap.delete(key);
        }
      });
      
      // 2. 新規作成・位置調整
      data.forEach((item, index) => {
        const key = JSON.stringify(item);
        let element = elementMap.get(key);
        if (!element) {
          element = createElement(item);
          elementMap.set(key, element);
        }
        
        // 位置調整
        const targetPosition = container.children[index];
        if (targetPosition !== element) {
          container.insertBefore(element, targetPosition);
        }
      });
    } else {
      // 単一要素処理
      container.innerHTML = '';
      container.appendChild(createElement(data));
    }
  };
};

export default h;
