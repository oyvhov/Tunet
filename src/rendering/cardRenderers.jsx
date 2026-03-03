/**
 * Backward-compatible renderer exports.
 *
 * The rendering system now lives in:
 * - `registry.js` for dispatch + type registry
 * - `cards/*Renderer.jsx` for per-card renderers
 * - `helpers.js` for shared helpers
 */

export { dispatchCardRender, CARD_REGISTRY } from './registry';
export * from './cards';
