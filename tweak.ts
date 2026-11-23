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
}

// tweak's own look. The glyph element carries an inline white-space: nowrap
// that every manifestation inherits, so the panel wraps again from its root:
// a long label never runs under its slider or gets cut off.
export const TWEAK_CSS = `
.tweak { white-space: normal; }
.tweak-row { display: grid; grid-template-columns: 170px 1fr 64px; gap: 8px; align-items: center; }
.tweak-row span { overflow-wrap: break-word; word-break: break-word; }
.tweak-group { margin-top: 10px; color: #ffd36b; }
.tweak input[type='number'] { width: 64px; font: inherit; }
.tweak-actions { margin-top: 10px; display: flex; gap: 8px; }
.tweak-json { font-size: 11px; color: #bbb; }
`

// One style, first in <head>, so any host stylesheet that follows wins.
function ensureStyle(): void {
  if (document.head.querySelector('style[data-tweak]')) return
  const style = document.createElement('style')
  style.setAttribute('data-tweak', '')
  style.textContent = TWEAK_CSS
  document.head.prepend(style)
}

export function tweakElement(o: TweakOptions): Element {
  let panel: HTMLElement | null = null
  return {
    id: 'tweak',
    title: 'tweak',
    symbol: '≈',
    opensAs: 'window',
    renderContent: () => {
      panel ??= build(o)
      return panel
    },
  }
}

function build(o: TweakOptions): HTMLElement {
  ensureStyle()
  const panel = document.createElement('div')
  panel.className = 'tweak'
  const json = document.createElement('pre')
  json.className = 'tweak-json'
  const showJson = () => {
    json.textContent = JSON.stringify(o.values, null, 1)
  }

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
      showJson()
      o.onChange(o.values)
    }
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
  const copy = document.createElement('button')
  copy.textContent = 'copy'
  copy.addEventListener('click', () =>
    navigator.clipboard.writeText(JSON.stringify(o.values, null, 1)).catch(e => o.onError('tweak: copy to clipboard failed', e)),
  )
  const reset = document.createElement('button')
  reset.textContent = 'reset'
  reset.addEventListener('click', () => o.onReset())
  actions.append(copy, reset)
  panel.append(actions, json)
  showJson()
  return panel
}

// The name it had while elements were glyphs.
export const tweakGlyph = tweakElement
