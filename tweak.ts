import type { Element } from '@jsr/teranos__elements'

// tweak: every adjustable number of a piece, as an element. It rests in the tray
// as a dot and opens as a window of tweaks. The panel is built once and the
// same element is shown every time it opens: nothing is reconstructed.

export interface TweakParam {
  key: string
  label: string
  group: string
  min: number
  max: number
  step: number
}

export interface TweakOptions {
  params: readonly TweakParam[]
  // Changed in place, so the host keeps reading the one object it owns.
  values: Record<string, number>
  onChange: (values: Record<string, number>) => void
  onError: (where: string, e: unknown) => void
  onReset: () => void
  // Where tweak keeps the values, so a reload comes back to them. One per page by default.
  keep?: string
}

// tweak's own look. The glyph element carries an inline white-space: nowrap
// that every manifestation inherits, so the panel wraps again from its root:
// a long label never runs under its slider or gets cut off.
// "and sliders should honestly look more like they belong"
// "like, the tweak panel itself should be a bit more see through, you would say"
// "and not really have a color of its own"
// "and no bold"
// "or italic"
// "and for its buttons to be correctly placed"
// "and its borders dont have to be this white and present, can be way more see through"
// 「[Opus 5.5] Everything in it is drawn in the words' colour, at less or more strength; nothing is」
// 「[Opus 5.5] weighted or slanted.」
export const TWEAK_CSS = `
[data-element-id='tweak'], [data-element-id='tweak'] * { font-weight: 400; font-style: normal; }
.tweak { white-space: normal; text-align: left; }
.tweak-row { display: grid; grid-template-columns: minmax(90px, 140px) 1fr 56px; gap: 10px; align-items: center; min-height: 26px; }
.tweak-row span { overflow-wrap: break-word; word-break: break-word; opacity: 0.85; }
.tweak-group { margin: 4px 0 6px; opacity: 0.55; }
.tweak input[type='range'] { width: 100%; min-width: 120px; margin: 0; accent-color: currentColor; opacity: 0.8; }
.tweak input[type='number'] { width: 56px; box-sizing: border-box; font: inherit; color: inherit; background: transparent;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius: 4px; padding: 2px 4px; text-align: right; }
.tweak-actions { margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px; }
.tweak button { font: inherit; color: inherit; background: transparent; cursor: pointer;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius: 4px; padding: 3px 10px; }
`

// One style, first in <head>, so any host stylesheet that follows wins.
function ensureStyle(): void {
  if (document.head.querySelector('style[data-tweak]')) return
  const style = document.createElement('style')
  style.setAttribute('data-tweak', '')
  style.textContent = TWEAK_CSS
  document.head.prepend(style)
}

// "To keep them, press copy in the tweak window"
// "i want to kill this idea ASAP"
// "also kill it in tweak itself, because the pattern isnt acceptable"
// 「[Opus 5.5] What is tuned is kept as it is tuned: every change is written to the browser's storage,」
// 「[Opus 5.5] and tweak puts it back into the host's values the moment it is made.」
function keeper(o: TweakOptions) {
  const where = `tweak:${o.keep ?? location.pathname}`
  return {
    restore() {
      let kept: Record<string, unknown>
      try {
        const raw = localStorage.getItem(where)
        if (raw === null) return
        kept = JSON.parse(raw)
      } catch (e) {
        o.onError(`tweak: could not read what was kept at ${where}`, e)
        return
      }
      let any = false
      for (const p of o.params) {
        const v = kept[p.key]
        if (typeof v !== 'number' || !Number.isFinite(v)) continue
        o.values[p.key] = Math.min(p.max, Math.max(p.min, v))
        any = true
      }
      if (any) o.onChange(o.values)
    },
    save() {
      try {
        localStorage.setItem(where, JSON.stringify(o.values))
      } catch (e) {
        o.onError(`tweak: could not keep the values at ${where}`, e)
      }
    },
  }
}

export function tweakElement(o: TweakOptions): Element {
  let panel: HTMLElement | null = null
  const kept = keeper(o)
  kept.restore()
  return {
    id: 'tweak',
    title: 'tweak',
    symbol: '≈',
    opensAs: 'window',
    // vitreous's thin glass, made of what the page says its glass is made of (--glass-rgb).
    color: 'var(--glass-thin, rgb(0 0 0 / 0.42))',
    border: '1px solid var(--glass-thin-border, rgb(255 255 255 / 0.12))',
    renderContent: () => {
      panel ??= build(o, kept.save)
      return panel
    },
  }
}

function build(o: TweakOptions, save: () => void): HTMLElement {
  ensureStyle()
  const panel = document.createElement('div')
  panel.className = 'tweak'
  const shown: (() => void)[] = []

  let group = ''
  for (const p of o.params) {
    if (p.group !== group) {
      group = p.group
      const heading = document.createElement('div')
      heading.className = 'tweak-group'
      heading.textContent = group
      panel.append(heading)
    }
    const row = document.createElement('label')
    row.className = 'tweak-row'
    const name = document.createElement('span')
    name.textContent = p.label
    const range = document.createElement('input')
    const num = document.createElement('input')
    range.type = 'range'
    num.type = 'number'
    for (const input of [range, num]) {
      input.min = String(p.min)
      input.max = String(p.max)
      input.step = String(p.step)
      input.value = String(o.values[p.key])
    }
    const set = (v: number) => {
      o.values[p.key] = Math.min(p.max, Math.max(p.min, v))
      range.value = num.value = String(o.values[p.key])
      save()
      o.onChange(o.values)
    }
    shown.push(() => {
      range.value = num.value = String(o.values[p.key])
    })
    range.addEventListener('input', () => set(Number(range.value)))
    num.addEventListener('change', () => {
      const v = Number(num.value)
      if (num.value.trim() === '' || !Number.isFinite(v)) {
        o.onError(`tweak: "${num.value}" is not a number for ${p.label}`, `kept ${o.values[p.key]}`)
        num.value = String(o.values[p.key])
        return
      }
      set(v)
    })
    row.append(name, range, num)
    panel.append(row)
  }

  const actions = document.createElement('div')
  actions.className = 'tweak-actions'
  const reset = document.createElement('button')
  reset.textContent = 'reset'
  reset.addEventListener('click', () => {
    o.onReset()
    for (const show of shown) show()
    save()
  })
  actions.append(reset)
  panel.append(actions)
  return panel
}

// The name it had while elements were glyphs.
export const tweakGlyph = tweakElement
