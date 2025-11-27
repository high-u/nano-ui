export const h = (tag, props = {}, ...children) => {
  const element = document.createElement(tag);
  const events = {};

  // Set properties
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on')) {
      // Handle events (onClick, onInput, etc.)
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
      events[eventName] = value;
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

  // イベント情報をWeakMapに保持
  eventStore.set(element, events);

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

// イベントハンドラを要素ごとに保持するストア（WeakMapなので削除漏れに強い）
const eventStore = new WeakMap();
  export const render = (container, createElements) => {
    // 前回DOMに追加した要素への参照を保持
    const elementRefs = new Map();

    return (...args) => {
      const newElements = createElements(...args);
      const usedKeys = new Set();

    // ツリーをパッチ
    const patchTree = (parent, newChildren) => {
      // 今回使用されたkeyと、位置ベースで再利用するkeyなし要素を記録
      const currentKeys = new Set();
      const retainedNoKey = new Set();
      // 既存の子要素のスナップショットを取得（位置ベース再利用用）
      const existingChildren = Array.from(parent.children);

      // keyなし要素を位置ベースで再利用する
      const findReusableNoKey = (newEl, index) => {
        const candidate = existingChildren[index];
        if (!candidate) return null;
        if (getKey(candidate)) return null;
        if (candidate.tagName !== newEl.tagName) return null;
        if (!attributesEqual(candidate, newEl)) return null;
        return candidate;
      };

      // プロパティ差分を同期する（属性で表現されない値を補完）
      const syncFormProps = (existingRef, newEl) => {
        if (existingRef instanceof HTMLInputElement || existingRef instanceof HTMLTextAreaElement) {
          if (existingRef.value !== newEl.value) existingRef.value = newEl.value;
          if (existingRef.checked !== newEl.checked) existingRef.checked = newEl.checked;
          if (existingRef.disabled !== newEl.disabled) existingRef.disabled = newEl.disabled;
        } else if (existingRef instanceof HTMLSelectElement) {
          if (existingRef.value !== newEl.value) existingRef.value = newEl.value;
          if (existingRef.selectedIndex !== newEl.selectedIndex) existingRef.selectedIndex = newEl.selectedIndex;
          if (existingRef.disabled !== newEl.disabled) existingRef.disabled = newEl.disabled;
        } else if (existingRef instanceof HTMLOptionElement) {
          if (existingRef.selected !== newEl.selected) existingRef.selected = newEl.selected;
          if (existingRef.disabled !== newEl.disabled) existingRef.disabled = newEl.disabled;
        }
      };

      // イベントを全付け替えする
      const replaceEvents = (existingRef, newEl) => {
        const oldEvents = eventStore.get(existingRef) || {};
        const newEvents = eventStore.get(newEl) || {};

        Object.entries(oldEvents).forEach(([eventName, handler]) => {
          existingRef.removeEventListener(eventName, handler);
        });
        Object.entries(newEvents).forEach(([eventName, handler]) => {
          existingRef.addEventListener(eventName, handler);
        });

        eventStore.set(existingRef, newEvents);
      };

      // テキストノードと子要素が混在しているか判定する
      const hasMixedContent = (el) => {
        let hasText = false;
        let hasElement = false;
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) hasElement = true;
          if (node.nodeType === Node.TEXT_NODE && node.textContent !== '') hasText = true;
        });
        return hasText && hasElement;
      };

      // 差分判定: 再作成が必要かを返す
      const shouldRecreate = (existingRef, newEl) => {
        if (hasMixedContent(newEl)) return true;
        if (existingRef && hasMixedContent(existingRef)) return true;
        if (!existingRef) return true;
        if (existingRef.tagName !== newEl.tagName) return true;
        if (!attributesEqual(existingRef, newEl)) return true;
        return false;
      };

      // 新しい要素を挿入し、参照を登録する
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
          retainedNoKey.add(newEl);
        }
      };

      // 位置調整のみを行う
      const ensurePosition = (el, index) => {
        const targetPosition = parent.children[index];
        if (el.parentNode !== parent || targetPosition !== el) {
          if (targetPosition) {
            parent.insertBefore(el, targetPosition);
          } else {
            parent.appendChild(el);
          }
        }
      };

      // 子要素の再帰処理を最後にまとめて呼ぶためのキュー
      const childRecurseQueue = [];

      // 新しい子要素を順番に適用する
      newChildren.forEach((newChild, index) => {
        const key = getKey(newChild);
        if (key) {
          currentKeys.add(key);
          usedKeys.add(key);
        }

        // key優先、なければ位置ベースで再利用候補を探す
        const existingRef = key ? elementRefs.get(key) : findReusableNoKey(newChild, index);

        // 再作成が必要ならログを出して挿入
        if (shouldRecreate(existingRef, newChild)) {
          const mixed = hasMixedContent(newChild) || (existingRef && hasMixedContent(existingRef));
          const reason = !existingRef ? '新規作成:' :
                         existingRef.tagName !== newChild.tagName ? 'タグ変更（再作成）:' :
                         mixed ? 'テキスト混在（再作成）:' :
                         '属性変更（再作成）:';
          console.log(reason, key);

          insertNewElement(newChild, index, existingRef);
          // 子は後でまとめて再帰
          childRecurseQueue.push({ parentEl: parent.children[index], newChild });
          return;
        }

        // 既存要素を再利用 - 位置調整
        ensurePosition(existingRef, index);

        // keyなしの再利用は記録する
        if (!key) {
          retainedNoKey.add(existingRef);
        }

        // フォーム系プロパティとイベントを同期
        syncFormProps(existingRef, newChild);
        replaceEvents(existingRef, newChild);

        // テキストのみ更新 or 子要素の再帰処理を後段で行う
        const isTextOnly = existingRef.children.length === 0 && newChild.children.length === 0;
        if (isTextOnly) {
          if (existingRef.textContent !== newChild.textContent) {
            existingRef.textContent = newChild.textContent;
          }
        } else {
          childRecurseQueue.push({ parentEl: existingRef, newChild });
        }
      });

      // 子要素の再帰処理をまとめて実行
      childRecurseQueue.forEach(({ parentEl, newChild }) => {
        patchTree(parentEl, Array.from(newChild.children));
      });

      // 使われなくなった子要素を削除
      Array.from(parent.children).forEach(child => {
        const key = getKey(child);
        if (key && !currentKeys.has(key)) {
          child.remove();
          return;
        }

        if (!key && !retainedNoKey.has(child)) {
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

// Proxy-based tags object (VanJS style)
export const tags = new Proxy({}, {
  get: (_, tag) => {
    // svgは文字列からパースし、propsを適用できるようにする（キャッシュ付き）
    if (tag === 'svg') {
      const svgCache = new Map();
      const parser = new DOMParser();
      const applyProps = (el, props = {}) => {
        Object.entries(props).forEach(([key, value]) => {
          if (key.startsWith('on')) {
            el.addEventListener(key.slice(2).toLowerCase(), value);
            el.setAttribute('data-has-event', 'true');
            return;
          }
          const finalValue = typeof value === 'function' ? value() : value;
          if (key in el) {
            el[key] = finalValue;
          } else {
            el.setAttribute(key, finalValue);
          }
        });
      };

      return (props = {}, svgString) => {
        const cacheKey = svgString;
        let template = svgCache.get(cacheKey);
        if (!template) {
          const doc = parser.parseFromString(svgString, 'image/svg+xml');
          template = doc.documentElement;
          svgCache.set(cacheKey, template);
        }

        const cloned = template.cloneNode(true);
        applyProps(cloned, props);
        return cloned;
      };
    }
    return (props = {}, ...children) => h(tag, props, ...children);
  }
});

// Export default as h for convenience
export default h;
