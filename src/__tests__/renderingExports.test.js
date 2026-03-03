import { describe, expect, it } from 'vitest';
import * as renderingIndex from '../rendering';
import * as cardRenderers from '../rendering/cardRenderers';

describe('rendering export barrels', () => {
  it('exposes the same renderer function keys in index and compatibility barrel', () => {
    const getRendererKeys = (obj) =>
      Object.keys(obj)
        .filter((key) => key.startsWith('render') && key.endsWith('Card'))
        .sort();

    expect(getRendererKeys(renderingIndex)).toEqual(getRendererKeys(cardRenderers));
  });
});
