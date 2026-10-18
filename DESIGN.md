---
version: alpha
name: File Analyzer
description: A quiet local file inspection bench with readable technical tables.
colors:
  primary: "#245BCE"
  primary-hover: "#1949AE"
  on-primary: "#FFFFFF"
  background: "#F3F6FA"
  surface: "#FFFFFF"
  subtle: "#EAF0F8"
  text: "#18283F"
  muted: "#53647B"
  border: "#D5DEEA"
  success: "#23705B"
  warning: "#855316"
  danger: "#B13445"
  scrollbar: "#8B9CB2"
  scrollbar-hover: "#657B98"
  scrollbar-active: "#405B80"
typography:
  display:
    fontFamily: '"Trebuchet MS", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "1.375rem"
    lineHeight: "1.4"
  body:
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.9375rem"
    lineHeight: "1.6"
  mono:
    fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace'
    fontSize: "0.8125rem"
    lineHeight: "1.6"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
spacing:
  xs: "0.375rem"
  sm: "0.75rem"
  md: "1.125rem"
  lg: "1.875rem"
components:
  button:
    height: "2.5rem"
  table:
    height: "2.75rem"
---

# File Analyzer design

## Overview

Product register: a small offline inspection tool for people checking local media, images and documents. README and `src/types.ts` are the product and data evidence. There is no prior UI or sibling workflow to inherit. Chinese (`zh-CN`) is the initial interface locale; language does not imply a specific regional market. No Japan-specific workflow applies.

North Star: a file inspection bench. The memorable element is the extension tile next to each imported file, with a precise, source-labelled parameter sheet. Keep the rest quiet: cool surfaces, restrained blue selection and readable data. Avoid marketing heroes, statistic cards, decorative charts and complex dashboard navigation.

## Colors

Frontmatter is the token source (Model A). `scripts/build-ui.mjs` generates `dist/ui/tokens.css`; `src/ui/styles.css` consumes `--color-<name>`, `--font-<role>`, `--text-<role>`, `--leading-<role>`, `--radius-<name>` and `--space-<name>`. Do not hand-copy palette values into components. All fonts and assets are local. Initial theme is light; forced-colors respects system colors.

## Typography

Display type is reserved for the product name and selected filename. Body text uses system Chinese-capable fonts. Technical values use monospace and tabular numerals; long filenames and paths wrap rather than relying on hover. Numbers use `Intl.NumberFormat('zh-CN')`; filesystem dates show local time with the timezone identified. Document-recorded dates retain their original representation and source.

## Layout

One window: header and action bar above a file list and details/comparison panel. Desktop list width is approximately 16rem. Below 760px, stack the file list above the active panel and use document scrolling. Each wide table owns horizontal overflow. The interface also reflows at 390px for zoom/narrow-window testing. No viewport clipping is used to force a table to fit.

## Elevation & Depth

Hierarchy comes from borders, selection and surface tones. Static content has no decorative shadows. Processing feedback uses reserved status space; file results do not move primary actions.

## Shapes

Small radii apply to buttons and extension tiles; medium radii apply to the workspace. Status always includes words, never color alone.

## Components

Canonical UI map and behavior (single-window scope; no separate UX-CONTRACT required):

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| File import | Desktop bridge + `src/ui/app.ts` | README and this contract | Native picker / local drag-drop; no upload | Desktop E2E |
| Selection | File-list buttons | This contract | One active detail file; compare the current imported list | UI E2E |
| Tables | Shared renderer + `src/ui/model.ts` | `src/types.ts` and this contract | Details / comparison; native read-only tables | Unit + UI E2E |
| Feedback | Badges and one polite live region | This contract | Waiting / processing / complete / partial / failed | UI E2E |
| Scrollbar | Global stylesheet | DESIGN.md generated tokens | Shared baseline; table/list geometry only | Browser computed style |
| Tabs | Detail/comparison tab pair | This contract | Arrow/Home/End; in-memory state only | Keyboard E2E |
| Select/Listbox | Labelled native audio-track select in `src/ui/app.ts` | README and this contract | OS-owned popup, keyboard and geometry; global stream indices | Spectrogram desktop E2E |
| Spectrogram | Detail panel + desktop spectrum worker | README, `src/spectrogram.ts` and this contract | On-demand static image for one selected audio stream | Known-frequency integration + desktop E2E |

The audio-track select deliberately accepts the operating system's popup geometry and standard keyboard behavior. Its label and options are Chinese; technical codec identifiers and units retain their standard names. No form, date popup, mutation, file deletion, toast stack, authentication or remote service is introduced. Removing/clearing affects only the in-memory list and needs no confirmation. The native OS file picker owns its own locale and geometry.

Import is available while parsing. Processing is serial in a background worker; events carry file IDs. Removed files and superseded attempts cannot reappear from stale responses. Retry is available for partial/failed results and never duplicates an active attempt. Selecting another file and switching views preserve completed data. Closing the window clears the session; no file paths are persisted.

Empty state explains drag/drop and offers the same Add files action. Waiting/processing states name the activity without a fake percentage. Missing tools keep base information, with a correction hint and retry. Partial parsing preserves available fields. Generic failures leave other files usable. Comparison distinguishes unavailable, missing and not-applicable values and never aggregates unrelated media tracks.

Audio/video details with an audio stream include one spectrum section before the parameter tables. Track options refer to actual global stream indices, with codec and available language/sample-rate context. Nothing is generated automatically. A Generate action starts one spectrum task for the window, independently of metadata parsing; other files remain inspectable and import stays available. A busy task names its file, never displays a fake percentage, and offers Cancel. Missing FFmpeg, an invalid/unavailable track, a resource limit or a timeout leaves metadata intact and offers retry. Removing, retrying or closing a file cancels its spectrum task and discards stale results.

Keep the spectrum's 1200:512 image footprint in idle, loading, success and failure states. Use the existing surface/border/text tokens and responsive layout; the data image's scientific colormap comes from FFmpeg, not a second UI palette. Time runs left to right in seconds; linear frequency runs from 0 Hz at the bottom to half the source sample rate at the top. Explain the logarithmic color intensity and combined channels beside the chart, with an accessible image description. Changing tracks never presents another track's cached image as the selection's result. The latest per-file image/selection is transient, is preserved when switching detail/comparison, and is cleared on removal/reanalysis. No export/editor, interactive zoom or automatic “true lossless” verdict is introduced.

All controls use native buttons and visible focus. Icons have text labels or localized accessible names. No product-native alert/confirm/prompt calls. A drag interaction always has a picker alternative. Reduced motion disables animation. Focus remains on stable controls during updates and returns to a surviving file/add button after removal. When the native picker closes, focus returns to its opener; if that control has disappeared, use the primary Add files button.

## Do's and Don'ts

- Keep the core interaction to add, inspect and compare.
- Share field formatting and status labels between views.
- Render filenames, metadata and diagnostic text as text, never HTML.
- Keep spectrum to one static, labelled image; keep packaging and external tool preparation outside the product interaction flow.
