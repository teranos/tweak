// 「[Opus 5.5] A DOM for the tests, the way @teranos/elements sets up its own: happy-dom's」
// window and document as globals.
const { Window } = await import('happy-dom')
const window = new Window()

// 「[Opus 5.5] @ts-ignore」
globalThis.window = window
// 「[Opus 5.5] @ts-ignore」
globalThis.document = window.document
// 「[Opus 5.5] @ts-ignore」
globalThis.HTMLElement = window.HTMLElement
// 「[Opus 5.5] @ts-ignore」
globalThis.Event = window.Event
// 「[Opus 5.5] tweak keeps what was tuned in the page's storage, under the page's path.」
// 「[Opus 5.5] @ts-ignore」
globalThis.localStorage = window.localStorage
// 「[Opus 5.5] @ts-ignore」
globalThis.location = window.location
