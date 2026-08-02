import assert from 'node:assert/strict';
import { Marked } from 'marked';
import { docClass, fontIjiri, getMeta, getTheme } from '../marked-font-ijiri.js';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function createMarked(options) {
  const marked = new Marked({ breaks: true });
  marked.use(fontIjiri(options));
  return marked;
}

function render(source, options) {
  return createMarked(options).parse(source);
}

test('renders inline font decoration classes', () => {
  const html = render('{!!R* 中華人民共和国}');

  assert.match(html, /<span class="fi fi-z2 fi-c-R fi-b">中華人民共和国<\/span>/);
});

test('leaves non font-ijiri braces untouched', () => {
  const html = render('{ "key": 1 }');

  assert.match(html, /\{ &quot;key&quot;: 1 \}/);
});

test('renders shorthand parens as small text and supports ruby', () => {
  const html = render('((~ ひそひそ)) ^漢字|かんじ^');

  assert.match(html, /<span class="fi fi-z0 fi-dim">ひそひそ<\/span>/);
  assert.match(html, /<ruby>漢字<rp>（<\/rp><rt>かんじ<\/rt><rp>）<\/rp><\/ruby>/);
});

test('renders image-only content as centered image markup', () => {
  const html = render('{!R /assets/photo.webp}');

  assert.match(
    html,
    /<span class="fi-img fi-img-size-4 fi-img-frame-color fi-img-color-R"><img src="\/assets\/photo\.webp" alt="" loading="lazy" decoding="async"><\/span>/,
  );
});

test('renders a block image from an image path line', () => {
  const html = render('/assets/photo.webp\n\n本文');

  assert.match(
    html,
    /<span class="fi-img fi-img-size-3"><img src="\/assets\/photo\.webp" alt="" loading="lazy" decoding="async"><\/span>/,
  );
  assert.match(html, /<p>本文<\/p>/);
});

test('renders block fence, spacing, and alignment extensions', () => {
  const html = render('{{{R\n赤い段落\n}}}\n\n+3\n\n::中央::');

  assert.match(html, /<div class="fi-block fi-c-R">/);
  assert.match(html, /<p>赤い段落<\/p>/);
  assert.match(html, /<div class="fi-ma" style="height:4\.50em"><\/div>/);
  assert.match(html, /<div class="fi-center">中央<\/div>/);
});

test('updates document metadata from front matter', () => {
  render('---\ntheme: white\nalign: left\n---\n\n本文');

  assert.equal(getTheme(), 'white');
  assert.deepEqual(getMeta(), { theme: 'white', align: 'left' });
  assert.equal(docClass(), 'fi-doc fi-theme-white fi-align-left');
});

test('supports custom inline delimiters', () => {
  const html = render('[R 赤]', { open: '[', close: ']' });

  assert.match(html, /<span class="fi fi-c-R">赤<\/span>/);
});

let failures = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures++;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

if (failures) {
  process.exitCode = 1;
} else {
  console.log(`${tests.length} tests passed`);
}
