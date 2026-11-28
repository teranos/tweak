// A DOM for the tests, the way @teranos/elements sets up its own: happy-dom's
// window and document as globals.
const { Window } = await import('happy-dom')
const window = new Window()

// @ts-ignore
globalThis.window = window
// @ts-ignore
globalThis.document = window.document
// @ts-ignore
globalThis.HTMLElement = window.HTMLElement
// @ts-ignore
globalThis.Event = window.Event
// tweak keeps what was tuned in the page's storage, under the page's path.
// @ts-ignore
globalThis.localStorage = window.localStorage
// @ts-ignore
globalThis.location = window.location
