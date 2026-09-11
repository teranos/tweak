# tweak

Every adjustable number of a piece, as a glyph.

Every number in a look is a guess until someone who can see it moves it.
tweak is how they get moved: a glyph on the [@qntx/glyphs](https://jsr.io/@qntx/glyphs)
runtime that rests in the tray as a dot and opens as a window of tweaks, one
slider and one exact number box per number, grouped, with copy, reset and the
live values as JSON.

The panel is built once. Opening tweak again shows the same element, so a
change made while it was closed is still there: nothing is reconstructed.

## Use

```ts
import { configureGlyphs, glyphRun } from '@jsr/qntx__glyphs'
import { tweakGlyph } from 'tweak'

const look = { zoom: 1, hue: 0 }

glyphRun.init()
glyphRun.add(
  tweakGlyph({
    params: [
      { key: 'zoom', label: 'zoom', group: 'shape', min: 0.2, max: 5, step: 0.01 },
      { key: 'hue', label: 'hue', group: 'colour', min: 0, max: 1, step: 0.01 },
    ],
    values: look, // changed in place
    onChange: values => {},
    onError: (where, e) => {},
    onReset: () => {},
  }),
)
```

A value typed outside its range is pulled into it; something that is not a
number is refused through `onError` and the old value is kept.

tweak brings its own look as one `<style data-tweak>` placed first in
`<head>`, so any host stylesheet can override it.

## Develop

```sh
bun install
bun test
```
