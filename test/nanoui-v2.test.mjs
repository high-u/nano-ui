import assert from 'node:assert';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {h, render, tags} from '../src/nanoui-v2.js';

const svgString = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

const setupDom = () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.DOMParser = dom.window.DOMParser;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
  globalThis.HTMLOptionElement = dom.window.HTMLOptionElement;
  return dom;
};

test('keyed element is reused when unchanged', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const renderer = render(container, () => [
    h('div', {'data-key': 'a', class: 'box'}, 'hello')
  ]);

  renderer();
  const first = container.firstChild;
  renderer();
  const second = container.firstChild;

  assert.strictEqual(first, second);
  dom.window.close();
});

test('keyed element is recreated when attributes differ', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  const renderer = render(container, (cls) => [
    h('div', {'data-key': 'a', class: cls}, 'hello')
  ]);

  renderer('one');
  const first = container.firstChild;
  renderer('two');
  const second = container.firstChild;

  console.log = origLog;

  assert.notStrictEqual(first, second);
  assert(logs.some(msg => msg.includes('属性変更')));
  dom.window.close();
});

test('non-key elements reuse by position and update text', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const renderer = render(container, (texts) => texts.map(t => h('span', {}, t)));

  renderer(['A', 'B', 'C']);
  const [a, b, c] = Array.from(container.children);

  renderer(['A', 'X', 'C']);
  const [a2, b2, c2] = Array.from(container.children);

  assert.strictEqual(a, a2);
  assert.strictEqual(c, c2);
  assert.strictEqual(b, b2);
  assert.strictEqual(b2.textContent, 'X');
  dom.window.close();
});

test('non-key element with attribute change is recreated', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const renderer = render(container, (cls) => [h('span', {class: cls}, 'x')]);

  renderer('a');
  const first = container.firstChild;
  renderer('b');
  const second = container.firstChild;

  assert.notStrictEqual(first, second);
  dom.window.close();
});

test('form properties sync on reuse', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const renderer = render(container, (val) => [
    h('input', {'data-key': 'input', value: val})
  ]);

  renderer('foo');
  const input1 = container.firstChild;
  renderer('bar');
  const input2 = container.firstChild;

  assert.strictEqual(input1, input2);
  assert.strictEqual(input2.value, 'bar');
  dom.window.close();
});

test('event handlers are replaced on reuse', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  let count1 = 0;
  let count2 = 0;

  const renderer = render(container, (handler) => [
    h('button', {'data-key': 'btn', onClick: handler}, 'click')
  ]);

  renderer(() => { count1 += 1; });
  const btn = container.firstChild;
  renderer(() => { count2 += 1; });

  btn.dispatchEvent(new dom.window.MouseEvent('click'));

  assert.strictEqual(count1, 0);
  assert.strictEqual(count2, 1);
  dom.window.close();
});

test('mixed text and children triggers recreation', () => {
  const dom = setupDom();
  const container = document.createElement('div');
  const renderer = render(container, (text) => [
    h('div', {'data-key': 'mixed'}, text, h('span', {}, 'child'))
  ]);

  renderer('foo');
  const first = container.firstChild;
  renderer('bar');
  const second = container.firstChild;

  assert.notStrictEqual(first, second);
  dom.window.close();
});

test('svg helper applies props and returns fresh clone', () => {
  setupDom();
  const svg1 = tags.svg({width: '10'}, svgString);
  const svg2 = tags.svg({width: '20'}, svgString);

  assert.strictEqual(svg1.getAttribute('width'), '10');
  assert.strictEqual(svg2.getAttribute('width'), '20');
  assert.notStrictEqual(svg1, svg2);
});
