import '@testing-library/jest-dom/vitest';

// jsdom does not implement media playback
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLCanvasElement.prototype.getContext = () => null;
