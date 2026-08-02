/**
 * marked-font-ijiri
 * テキストサイト風「フォント弄り」記法を marked に追加する拡張。
 *
 *   {修飾子 本文}          修飾子 → 半角空白 → 本文
 *   {!! 特大の文字}
 *   {!!R* 赤くて太い巨大文字}
 *   {R 色だけ変える}
 *   {. ぼそっとしたツッコミ}
 *   photo.jpg             中サイズ・中央寄せ画像
 *   {!!! photo.jpg}       画像。本文が画像パスだけなら中央寄せ画像になる
 *   {..R photo.png}       最小サイズ、赤い枠線
 *   ((ぼそっとしたツッコミ))   ← {. …} の略記
 *   +++ / +15              間（空行）
 *   ::テキスト::           中央寄せ
 *   ｜漢字《かんじ》        ルビ
 *
 * 「{ + 修飾子1文字以上 + 半角空白 + 本文 + }」に合致しない波括弧は素通しする。
 */

const MODCHARS = '[A-Za-z0-9*_~#!.-]{1,12}';

const COLORS = new Set(['R', 'B', 'Y', 'G', 'P', 'W', 'K']);
const FACES = { m: 'fi-f-m', g: 'fi-f-g', t: 'fi-f-t' };
const EFFECTS = { b: 'fi-blink', s: 'fi-shadow', o: 'fi-outline' };
const SYMBOLS = { '*': 'fi-b', _: 'fi-i', '-': 'fi-strike', '~': 'fi-dim', '#': 'fi-box' };

const BIG = ['fi-z1', 'fi-z2', 'fi-z3', 'fi-z4'];
const SMALL = ['fi-z0', 'fi-z00'];
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg)(?:[?#][^\s"'<>]*)?$/i;

let lastTheme = 'black';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escAttr = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** 修飾子文字列 → CSS クラス配列 */
function parseMods(raw) {
  const classes = [];
  let big = 0;
  let small = 0;
  let digit = null;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];

    if (c === '_' && raw[i + 1] === '_') {
      classes.push('fi-u');
      i++;
      continue;
    }
    if (c === '!') { big++; continue; }
    if (c === '.') { small++; continue; }
    if (COLORS.has(c)) { classes.push('fi-c-' + c); continue; }
    if (FACES[c]) { classes.push(FACES[c]); continue; }
    if (EFFECTS[c]) { classes.push(EFFECTS[c]); continue; }
    if (SYMBOLS[c]) { classes.push(SYMBOLS[c]); continue; }
    if (c >= '1' && c <= '4') digit = Number(c);
  }

  let size = null;
  if (big) size = BIG[Math.min(big, BIG.length) - 1];
  else if (small) size = SMALL[Math.min(small, SMALL.length) - 1];
  else if (digit) size = BIG[digit - 1];

  return [...new Set(size ? [size, ...classes] : classes)];
}

function span(classes, inner) {
  return `<span class="${['fi', ...classes].join(' ')}">${inner}</span>`;
}

function isImagePath(src) {
  return /^[^\s"'<>]+$/.test(src) && !/^javascript:/i.test(src) && IMAGE_EXT.test(src);
}

function parseImageMods(raw) {
  let bang = 0;
  let dot = 0;
  let digit = null;
  let color = null;
  let photo = false;
  let shadow = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '!') { bang++; continue; }
    if (c === '.') { dot++; continue; }
    if (c >= '1' && c <= '5') { digit = Number(c); continue; }
    if (COLORS.has(c)) { color = c; continue; }
    if (c === '#') { photo = true; continue; }
    if (c === 's') { shadow = true; continue; }
  }

  let size = 3;
  if (digit) size = digit;
  else if (dot >= 2) size = 1;
  else if (dot === 1) size = 2;
  else if (bang >= 2) size = 5;
  else if (bang === 1) size = 4;

  const classes = ['fi-img', `fi-img-size-${size}`];
  if (photo) classes.push('fi-img-frame-photo');
  else if (shadow) classes.push('fi-img-frame-shadow');
  else if (color) classes.push('fi-img-frame-color', `fi-img-color-${color}`);

  return classes;
}

function image(src, classes) {
  return `<span class="${classes.join(' ')}"><img src="${escAttr(src)}" alt="" loading="lazy" decoding="async"></span>`;
}

/**
 * 開き記号から対応する閉じ記号までの位置を返す（入れ子・エスケープを考慮）。
 * 見つからなければ -1。
 */
function findClose(src, from, limit, open, close) {
  let depth = 1;
  for (let i = from; i < limit; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === open) depth++;
    else if (c === close && !--depth) return i;
  }
  return -1;
}

/* ---------- インライン: {修飾子 本文} ---------- */

function makeBrace(open, close) {
  const openRe = new RegExp(`^${esc(open)}(${MODCHARS})[ \\t]+(?=\\S)`);
  const startRe = new RegExp(`(?<!\\\\)${esc(open)}`);

  return {
    name: 'fiBrace',
    level: 'inline',
    start(src) {
      const m = src.match(startRe);
      return m ? m.index : undefined;
    },
    tokenizer(src) {
      const m = openRe.exec(src);
      if (!m) return;

      const nl = src.indexOf('\n');
      const limit = nl === -1 ? src.length : nl;
      const head = m[0].length;
      const end = findClose(src, head, limit, open, close);
      if (end === -1) return;

      const content = src.slice(head, end).replace(/\s+$/, '');
      if (!content) return;

      return {
        type: 'fiBrace',
        raw: src.slice(0, end + 1),
        classes: parseMods(m[1]),
        imageClasses: isImagePath(content) ? parseImageMods(m[1]) : null,
        src: isImagePath(content) ? content : null,
        tokens: this.lexer.inlineTokens(content),
      };
    },
    renderer(token) {
      if (token.src) {
        return image(token.src, token.imageClasses);
      }
      return span(token.classes, this.parser.parseInline(token.tokens));
    },
  };
}

/* ---------- インライン: ((…)) — {. …} の略記 ---------- */

const parens = {
  name: 'fiParens',
  level: 'inline',
  start(src) {
    const m = src.match(/(?<!\\)\(\(/);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const rule = new RegExp(`^\\(\\((?:(${MODCHARS})[ \\t]+)?(?=\\S)([^\\n]*?[^\\s\\\\])\\)\\)`);
    const m = rule.exec(src);
    if (!m) return;
    const classes = parseMods(m[1] || '');
    return {
      type: 'fiParens',
      raw: m[0],
      classes: classes.some((c) => /^fi-z/.test(c)) ? classes : ['fi-z0', ...classes],
      tokens: this.lexer.inlineTokens(m[2]),
    };
  },
  renderer(token) {
    return span(token.classes, this.parser.parseInline(token.tokens));
  },
};

/* ---------- インライン: ルビ ^漢字|かんじ^ ---------- */

const RUBY_CARET = /^\^(?!\s)([^|\n^]+?)\|([^\n^]+?)\^/;
const RUBY_AOZORA = /^[｜|]([^《\n]+)《([^》\n]+)》/;
const RUBY_START = /(?<!\\)\^[^|\n^]+\||(?<!\\)[｜|][^《\n]*《/;

const ruby = {
  name: 'fiRuby',
  level: 'inline',
  start(src) {
    const m = src.match(RUBY_START);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const m = RUBY_CARET.exec(src) || RUBY_AOZORA.exec(src);
    if (!m) return;
    return { type: 'fiRuby', raw: m[0], text: m[2], tokens: this.lexer.inlineTokens(m[1]) };
  },
  renderer(token) {
    const base = this.parser.parseInline(token.tokens);
    return `<ruby>${base}<rp>（</rp><rt>${escAttr(token.text)}</rt><rp>）</rp></ruby>`;
  },
};

/* ---------- ブロック: {{{修飾子 … }}} ---------- */

function makeFence(open, close) {
  const openRe = new RegExp(`^(${esc(open)}{3,})[ \\t]*(${MODCHARS})?[ \\t]*(?:\\n|$)`);
  const startRe = new RegExp(`^${esc(open)}{3,}`, 'm');

  return {
    name: 'fiFence',
    level: 'block',
    start(src) {
      const m = src.match(startRe);
      return m ? m.index : undefined;
    },
    tokenizer(src) {
      const m = openRe.exec(src);
      if (!m) return;

      const closeRe = new RegExp(`^[ \\t]{0,3}${esc(close)}{${m[1].length},}[ \\t]*\\r?$`);
      const lines = src.split('\n');

      let end = -1;
      for (let i = 1; i < lines.length; i++) {
        if (closeRe.test(lines[i])) { end = i; break; }
      }

      const last = end === -1 ? lines.length - 1 : end;
      let raw = lines.slice(0, last + 1).join('\n');
      if (src.length > raw.length) raw += '\n';

      const body = lines.slice(1, end === -1 ? lines.length : end).join('\n');

      return {
        type: 'fiFence',
        raw,
        classes: parseMods(m[2] || ''),
        tokens: this.lexer.blockTokens(body ? body + '\n' : '', []),
      };
    },
    renderer(token) {
      const cls = ['fi-block', ...token.classes].join(' ');
      return `<div class="${cls}">\n${this.parser.parse(token.tokens)}</div>\n`;
    },
  };
}

/* ---------- ブロック: 間 +++ / +15 ---------- */

const ma = {
  name: 'fiMa',
  level: 'block',
  start(src) {
    const m = src.match(/^\+/m);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const m = /^(?:\+(\d{1,3})|(\+{1,40}))[ \t]*(?:\n+|$)/.exec(src);
    if (!m) return;
    const lines = m[1] ? Number(m[1]) : m[2].length;
    if (!lines) return;
    return { type: 'fiMa', raw: m[0], lines: Math.min(lines, 200) };
  },
  renderer(token) {
    return `<div class="fi-ma" style="height:${(token.lines * 1.5).toFixed(2)}em"></div>\n`;
  },
};

/* ---------- ブロック: 画像パスだけの行 ---------- */

const imageLine = {
  name: 'fiImageLine',
  level: 'block',
  start(src) {
    const m = src.match(/^[^\s"'<>]+\.(?:png|jpe?g|gif|webp|avif|svg)(?:[?#][^\s"'<>]*)?[ \t]*(?:\n|$)/im);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const m = /^([^\s"'<>]+\.(?:png|jpe?g|gif|webp|avif|svg)(?:[?#][^\s"'<>]*)?)[ \t]*(?:\n+|$)/i.exec(src);
    if (!m || !isImagePath(m[1])) return;
    return {
      type: 'fiImageLine',
      raw: m[0],
      src: m[1],
      imageClasses: parseImageMods(''),
    };
  },
  renderer(token) {
    return image(token.src, token.imageClasses) + '\n';
  },
};

/* ---------- ブロック: 行揃え ::中央:: >>右>> <<左<< ---------- */

const ALIGN = { '::': 'fi-center', '>>': 'fi-right', '<<': 'fi-left' };

const align = {
  name: 'fiAlign',
  level: 'block',
  start(src) {
    const m = src.match(/^(?:::|>>|<<)/m);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const one = /^(::|>>|<<)[ \t]*(?=\S)([^\n]*?[^\s\\])[ \t]*\1[ \t]*(?:\n+|$)/.exec(src);
    if (one) {
      return {
        type: 'fiAlign',
        raw: one[0],
        cls: ALIGN[one[1]],
        block: false,
        tokens: this.lexer.inlineTokens(one[2]),
      };
    }

    const open = /^(::|>>|<<)[ \t]*\r?(?:\n|$)/.exec(src);
    if (!open) return;

    const closeRe = new RegExp(`^[ \\t]{0,3}${open[1].replace(/[:<>]/g, '\\$&')}[ \\t]*\\r?$`);
    const lines = src.split('\n');

    let stop = -1;
    for (let i = 1; i < lines.length; i++) {
      if (closeRe.test(lines[i])) { stop = i; break; }
    }
    if (stop === -1) return;

    let raw = lines.slice(0, stop + 1).join('\n');
    if (src.length > raw.length) raw += '\n';
    const body = lines.slice(1, stop).join('\n');

    return {
      type: 'fiAlign',
      raw,
      cls: ALIGN[open[1]],
      block: true,
      tokens: this.lexer.blockTokens(body ? body + '\n' : '', []),
    };
  },
  renderer(token) {
    const inner = token.block ? '\n' + this.parser.parse(token.tokens) : this.parser.parseInline(token.tokens);
    return `<div class="${token.cls}">${inner}</div>\n`;
  },
};

/* ---------- 行頭字下げ ---------- */

const LIST_OR_QUOTE = /^(?:[-*+>]\s|\d{1,9}[.)]\s)/;

/** 行頭の半角スペース／タブを NBSP に変換する（CSS に潰されないようにする） */
function convertIndent(markdown) {
  let fence = null;

  return markdown
    .split('\n')
    .map((line) => {
      const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (f) {
        const kind = f[1][0];
        if (!fence) fence = kind;
        else if (fence === kind) fence = null;
        return line;
      }
      if (fence) return line;

      const m = /^([ \t]+)(?=\S)/.exec(line);
      if (!m) return line;

      const rest = line.slice(m[0].length);
      if (LIST_OR_QUOTE.test(rest)) return line;

      let width = 0;
      for (const c of m[1]) width += c === '\t' ? 4 : 1;
      return '\u00A0'.repeat(width) + rest;
    })
    .join('\n');
}

/* ---------- フロントマター ---------- */

const DEFAULT_META = { theme: 'black', align: 'center' };
const META_ALLOWED = {
  theme: new Set(['black', 'dos', 'white']),
  align: new Set(['center', 'left', 'right']),
};

let lastMeta = { ...DEFAULT_META };

function makePreprocess(indent) {
  return function preprocess(markdown) {
    lastMeta = { ...DEFAULT_META };

    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
    if (m) {
      for (const line of m[1].split(/\r?\n/)) {
        const kv = /^\s*([A-Za-z_][\w-]*)\s*:\s*(\S+)/.exec(line);
        if (!kv) continue;

        const key = kv[1].toLowerCase();
        const value = kv[2].toLowerCase();
        if (META_ALLOWED[key]) {
          lastMeta[key] = META_ALLOWED[key].has(value) ? value : DEFAULT_META[key];
        } else {
          lastMeta[key] = value;
        }
      }
      markdown = markdown.slice(m[0].length);
    }
    return indent ? convertIndent(markdown) : markdown;
  };
}

/** 直前のパースのフロントマター（{ theme, align, ... }） */
export function getMeta() {
  return { ...lastMeta };
}

/** 直前のパースで指定されたテーマ名 */
export function getTheme() {
  return lastMeta.theme;
}

/** 出力を包む div に付けるクラス名 */
export function docClass() {
  return `fi-doc fi-theme-${lastMeta.theme} fi-align-${lastMeta.align}`;
}

/**
 * marked.use(fontIjiri()) で有効化
 * @param {{ open?: string, close?: string, parens?: boolean, indent?: boolean }} options
 */
export function fontIjiri(options = {}) {
  const { open = '{', close = '}', parens: useParens = true, indent = true } = options;
  const extensions = [imageLine, makeBrace(open, close), ruby, ma, align];
  if (open !== close) extensions.unshift(makeFence(open, close));
  if (useParens) extensions.splice(open !== close ? 2 : 1, 0, parens);
  return { extensions, hooks: { preprocess: makePreprocess(indent) } };
}

export default fontIjiri;
