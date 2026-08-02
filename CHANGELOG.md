# Changelog

## 0.1.1 - 2026-08-02

### Fixed

- Escape ruby annotation text before rendering it into `<rt>`.
- Fall back to default `theme` and `align` values when front matter contains unknown values.
- Update npm README with the simplified post-initial-release release flow.

## 0.1.0 - 2026-08-02

Initial release.

### Added

- marked extension for text-site style font decoration syntax.
- Inline decoration syntax such as `{!! big text}`, `{R red text}`, and `((small aside))`.
- Block decoration syntax with `{{{modifier` ... `}}}`.
- Image syntax for image path lines and `{modifier image-path}`.
- Spacing blocks with `+++` and `+15`.
- Alignment blocks and inline alignment with `::`, `>>`, and `<<`.
- Ruby syntax with `^漢字|かな^` and `｜漢字《かな》`.
- Front matter support for `theme` and `align`.
- CSS themes: `black`, `dos`, and `white`.
- TypeScript declaration file.
- Live preview page: https://tanapi.github.io/marked-font-ijiri/

### Package

- ESM package exports for the marked extension and CSS file.
- MIT license.
- GitHub Actions CI for Node.js 18, 20, 22, and 24.
- GitHub Pages deployment workflow.
- npm publish workflow using GitHub Actions Trusted Publishing.
