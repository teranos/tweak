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
// "and tweak font should be minimal monochromome monospace"
// "and no yellow please"
export const TWEAK_CSS = `
[data-element-id='tweak'], [data-element-id='tweak'] * { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 400; font-style: normal; }
.tweak { white-space: normal; text-align: left; font-size: 12px; }
.tweak-profiles { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
.tweak-row { display: grid; grid-template-columns: minmax(90px, 140px) 1fr 44px; gap: 10px; align-items: center; min-height: 24px; }
.tweak-row > span:first-child { overflow-wrap: break-word; word-break: break-word; opacity: 0.85; }
.tweak-row .tweak-exact { text-align: right; opacity: 0.85; }
.tweak-group { margin: 4px 0 6px; opacity: 0.55; }
.tweak input[type='range'] { width: 100%; min-width: 120px; margin: 0; accent-color: currentColor; opacity: 0.8; }
.tweak-actions { margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px; }
.tweak button { font: inherit; color: inherit; background: transparent; cursor: pointer;
  border: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius: 4px; opacity: 0.6; }
.tweak button[aria-pressed='true'] { opacity: 1; border-color: currentColor; }
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
// "and tweak should have profiles,"
// "and + should create new profile"
// 「[Opus 5.5] Kept as profiles, each its own values, and which one is in use.」
interface Kept {
  current: string
  profiles: Record<string, Record<string, number>>
}

function keeper(o: TweakOptions) {
  const where = `tweak:${o.keep ?? location.pathname}`
  const kept: Kept = { current: '1', profiles: {} }
  // What was kept, pulled into each tweak's range; what is not a number is left out.
  const usable = (raw: unknown): Record<string, number> => {
    const values: Record<string, number> = {}
    if (raw === null || typeof raw !== 'object') return values
    for (const p of o.params) {
      const v = (raw as Record<string, unknown>)[p.key]
      if (typeof v === 'number' && Number.isFinite(v)) values[p.key] = Math.min(p.max, Math.max(p.min, v))
    }
    return values
  }
  const write = () => {
    try {
      localStorage.setItem(where, JSON.stringify(kept))
    } catch (e) {
      o.onError(`tweak: could not keep the values at ${where}`, e)
    }
  }
  return {
    restore() {
      let raw: unknown
      try {
        const text = localStorage.getItem(where)
        if (text === null) return
        raw = JSON.parse(text)
      } catch (e) {
        o.onError(`tweak: could not read what was kept at ${where}`, e)
        return
      }
      const r = raw as Partial<Kept>
      if (r && typeof r === 'object' && r.profiles && typeof r.profiles === 'object') {
        for (const [name, values] of Object.entries(r.profiles)) kept.profiles[name] = usable(values)
        kept.current = typeof r.current === 'string' && r.current in kept.profiles ? r.current : Object.keys(kept.profiles)[0] ?? '1'
      } else {
        // Kept before there were profiles: that is the first one.
        kept.profiles['1'] = usable(raw)
      }
      const values = kept.profiles[kept.current]
      if (values && Object.keys(values).length) {
        Object.assign(o.values, values)
        o.onChange(o.values)
      }
    },
    save() {
      kept.profiles[kept.current] = { ...o.values }
      write()
    },
    names: () => (Object.keys(kept.profiles).length ? Object.keys(kept.profiles) : [kept.current]),
    current: () => kept.current,
    // A new profile starts from what is tuned now, and is the one in use.
    add(): string {
      const names = new Set(Object.keys(kept.profiles))
      names.add(kept.current)
      let n = names.size + 1
      while (names.has(String(n))) n++
      kept.profiles[kept.current] = { ...o.values }
      kept.current = String(n)
      kept.profiles[kept.current] = { ...o.values }
      write()
      o.onChange(o.values)
      return kept.current
    },
    use(name: string) {
      if (!(name in kept.profiles)) return
      kept.current = name
      Object.assign(o.values, kept.profiles[name])
      write()
      o.onChange(o.values)
    },
  }
}

type Keeper = ReturnType<typeof keeper>

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
      panel ??= build(o, kept)
      return panel
    },
  }
}

function build(o: TweakOptions, kept: Keeper): HTMLElement {
  ensureStyle()
  const panel = document.createElement('div')
  panel.className = 'tweak'
  const shown: (() => void)[] = []
  const showAll = () => {
    for (const show of shown) show()
  }

  const profiles = document.createElement('div')
  profiles.className = 'tweak-profiles'
  const showProfiles = () => {
    profiles.replaceChildren()
    for (const name of kept.names()) {
      const pick = document.createElement('button')
      pick.textContent = name
      pick.setAttribute('aria-pressed', String(name === kept.current()))
      pick.addEventListener('click', () => {
        kept.use(name)
        showAll()
      })
      profiles.append(pick)
    }
    const add = document.createElement('button')
    add.textContent = '+'
    add.setAttribute('aria-label', 'new profile')
    add.addEventListener('click', () => {
      kept.add()
      showAll()
    })
    profiles.append(add)
  }
  shown.push(showProfiles)
  panel.append(profiles)

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
    range.type = 'range'
    range.min = String(p.min)
    range.max = String(p.max)
    range.step = String(p.step)
    const exact = document.createElement('span')
    exact.className = 'tweak-exact'
    const show = () => {
      range.value = exact.textContent = String(o.values[p.key])
    }
    show()
    shown.push(show)
    range.addEventListener('input', () => {
      o.values[p.key] = Math.min(p.max, Math.max(p.min, Number(range.value)))
      exact.textContent = String(o.values[p.key])
      kept.save()
      o.onChange(o.values)
    })
    row.append(name, range, exact)
    panel.append(row)
  }

  const actions = document.createElement('div')
  actions.className = 'tweak-actions'
  const reset = document.createElement('button')
  reset.textContent = 'reset'
  reset.addEventListener('click', () => {
    o.onReset()
    showAll()
    kept.save()
  })
  actions.append(reset)
  panel.append(actions)
  showProfiles()
  return panel
}

// The name it had while elements were glyphs.
export const tweakGlyph = tweakElement
