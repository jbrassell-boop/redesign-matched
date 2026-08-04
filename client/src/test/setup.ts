import '@testing-library/jest-dom';

// jsdom ships no matchMedia, and antd's responsive observer calls it on mount —
// without this any component rendering a Table/Grid throws before it renders.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}
