#!/usr/bin/env node
// Convert an SVG string to tagsSvg-based JS expression (ESM).

import { JSDOM } from 'jsdom';

const input = process.argv[2];
if (!input) {
  console.error('Usage: svg-to-tags "<svg ...>"');
  process.exit(1);
}

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const parser = new dom.window.DOMParser();
const doc = parser.parseFromString(input, 'image/svg+xml');
const svgEl = doc.documentElement;

const tagSet = new Set();

const escapeStr = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const serializeAttrs = (el) => {
  const entries = [];
  for (const attr of el.attributes) {
    const key = attr.name;
    const value = attr.value;
    entries.push(`'${key}': '${escapeStr(value)}'`);
  }
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
};

const serializeNode = (node) => {
  if (node.nodeType === dom.window.Node.TEXT_NODE) {
    const text = node.textContent.trim();
    return text ? `'${escapeStr(text)}'` : null;
  }
  if (node.nodeType !== dom.window.Node.ELEMENT_NODE) return null;

  const tag = node.tagName;
  tagSet.add(tag);

  const children = Array.from(node.childNodes)
    .map(serializeNode)
    .filter(Boolean);

  const attrs = serializeAttrs(node);
  const childStr = children.length ? `, ${children.join(', ')}` : '';
  return `${tag}(${attrs}${childStr})`;
};

const body = serializeNode(svgEl);
const tagsLine = `const { ${Array.from(tagSet).join(', ')} } = tagsSvg;`;

console.log(tagsLine);
console.log(body);
