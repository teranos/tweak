import { beforeEach, describe, expect, test } from 'bun:test'
import { type TweakParam, tweakElement } from './tweak'

const PARAMS: TweakParam[] = [
  { key: 'zoom', label: 'zoom', group: 'shape', min: 0.2, max: 5, step: 0.01 },
  { key: 'folds', label: 'fractal folds', group: 'shape', min: 1, max: 6, step: 1 },
  { key: 'hue', label: 'hue', group: 'colour', min: 0, max: 1, step: 0.01 },
]

// 「[Opus 5.5] Each test starts from a page that has kept nothing.」
beforeEach(() => localStorage.clear())

function setup() {
  const values: Record<string, number> = { zoom: 1, folds: 3, hue: 0 }
  const changes: Record<string, number>[] = []
  const errors: string[] = []
  const glyph = tweakElement({
    params: PARAMS,
    values,
    onChange: v => changes.push({ ...v }),
    onError: (where, e) => errors.push(`${where}: ${String(e)}`),
    onReset: () => {},
  })
  const panel = glyph.renderContent()
  const ranges = [...panel.querySelectorAll('input[type="range"]')] as HTMLInputElement[]
  const numbers = [...panel.querySelectorAll('.tweak-exact')] as HTMLElement[]
  return { values, changes, errors, glyph, panel, ranges, numbers }
}

function set(input: HTMLInputElement, value: string, event: 'input' | 'change') {
  input.value = value
  input.dispatchEvent(new Event(event))
}

describe('Tim: tweak is an element that opens as a window of tweaks', () => {
  test('it is the tweak element, and opens as a window', () => {
    const { glyph } = setup()
    expect(glyph.id).toBe('tweak')
    expect(glyph.title).toBe('tweak')
    expect(glyph.opensAs).toBe('window')
  })

  test('one slider and its exact number per tweak, at the current values', () => {
    const { ranges, numbers } = setup()
    expect(ranges.map(r => Number(r.value))).toEqual([1, 3, 0])
    expect(numbers.map(n => Number(n.textContent))).toEqual([1, 3, 0])
  })

  test('each slider carries its tweak range', () => {
    const { ranges } = setup()
    expect([ranges[1].min, ranges[1].max, ranges[1].step]).toEqual(['1', '6', '1'])
  })

  test('moving a slider changes the value and reports it', () => {
    const { values, changes, ranges, numbers } = setup()
    set(ranges[0], '2.5', 'input')
    expect(values.zoom).toBe(2.5)
    expect(numbers[0].textContent).toBe('2.5')
    expect(changes.at(-1)?.zoom).toBe(2.5)
  })

  test('tweaks are grouped under headings, in order', () => {
    const { panel } = setup()
    const headings = [...panel.querySelectorAll('.tweak-group')].map(h => h.textContent)
    expect(headings).toEqual(['shape', 'colour'])
  })

  test('tweak brings its own look: one style, placed before the host’s so the host can override it', () => {
    document.head.innerHTML = '<style id="host"></style>'
    setup()
    setup()
    const styles = document.head.querySelectorAll('style[data-tweak]')
    expect(styles.length).toBe(1)
    expect(document.head.firstElementChild).toBe(styles[0])
    // The glyph element's inline white-space: nowrap would otherwise keep a
    // long label from wrapping and run it under its slider.
    expect(styles[0].textContent).toContain('white-space: normal')
  })
})

describe('Jenny: opening tweak again reveals what was always there', () => {
  test('the panel is the same element every time it is shown, never rebuilt', () => {
    const { glyph, panel } = setup()
    expect(glyph.renderContent()).toBe(panel)
  })

  test('a change made while it was closed is still there when it opens', () => {
    const { glyph, values, ranges } = setup()
    set(ranges[0], '4', 'input')
    const again = glyph.renderContent()
    const zoom = again.querySelector('input[type="range"]') as HTMLInputElement
    expect(zoom.value).toBe('4')
    expect(values.zoom).toBe(4)
  })
})

describe('Jenny: what she tuned is there after a reload, with nothing to copy', () => {
  test('a change is kept, and a new tweak on the same page starts from it', () => {
    localStorage.clear()
    const first = setup()
    set(first.ranges[0], '3.2', 'input')
    const again = setup()
    expect(again.values.zoom).toBe(3.2)
    expect(again.ranges[0].value).toBe('3.2')
    expect(again.changes.at(-1)?.zoom).toBe(3.2)
  })

  test('there is nothing to copy', () => {
    const { panel } = setup()
    expect([...panel.querySelectorAll('button')].map(b => b.textContent)).not.toContain('copy')
  })

  test('what was kept is pulled into its range, and anything not a number is ignored', () => {
    // 「[Opus 5.5] Kept before there were profiles: it becomes the first one.」
    localStorage.setItem(`tweak:${location.pathname}`, JSON.stringify({ zoom: 99, folds: 'many' }))
    const { values } = setup()
    expect(values.zoom).toBe(5)
    expect(values.folds).toBe(3)
  })
})

// "and tweak should have profiles,"
// "and + should create new profile"
describe('Jenny: profiles', () => {
  const profileButtons = (panel: HTMLElement) => [...panel.querySelectorAll('.tweak-profiles button')] as HTMLButtonElement[]

  test('+ makes a new profile from what is tuned now, and it is the one in use', () => {
    const { panel, ranges, changes } = setup()
    set(ranges[0], '2', 'input')
    const before = changes.length
    profileButtons(panel).at(-1)!.click()
    expect(changes.length).toBe(before + 1)
    const buttons = profileButtons(panel)
    expect(buttons.map(b => b.textContent)).toEqual(['1', '2', '+'])
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
    expect(ranges[0].value).toBe('2')
  })

  test('each profile keeps its own values, and picking one brings them back', () => {
    const { panel, values, ranges } = setup()
    set(ranges[0], '2', 'input')
    profileButtons(panel).at(-1)!.click()
    set(ranges[0], '4', 'input')
    profileButtons(panel)[0].click()
    expect(values.zoom).toBe(2)
    expect(ranges[0].value).toBe('2')
    profileButtons(panel)[1].click()
    expect(values.zoom).toBe(4)
  })

  test('after a reload, the profiles and the one in use are there', () => {
    const first = setup()
    set(first.ranges[0], '2', 'input')
    profileButtons(first.panel).at(-1)!.click()
    set(first.ranges[0], '4', 'input')
    const again = setup()
    expect(again.values.zoom).toBe(4)
    expect(profileButtons(again.panel).slice(0, -1).map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
  })
})
