import type { MarkedExtension } from 'marked';

export interface FontIjiriOptions {
  open?: string;
  close?: string;
  parens?: boolean;
  indent?: boolean;
}

export interface FontIjiriMeta {
  theme: string;
  align: string;
  [key: string]: string;
}

export function getMeta(): FontIjiriMeta;
export function getTheme(): string;
export function docClass(): string;
export function fontIjiri(options?: FontIjiriOptions): MarkedExtension;

export default fontIjiri;
