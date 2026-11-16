import test from 'node:test';
import assert from 'node:assert/strict';
import { copyTextToClipboard } from './clipboard';

interface GlobalScopeWithMocks {
  window?: unknown;
  document?: unknown;
  navigator?: unknown;
}

const g = globalThis as unknown as GlobalScopeWithMocks;

test('clipboard: returns false when executed in non-browser environment', async () => {
  const origWindow = g.window;
  const origDoc = g.document;

  delete g.window;
  delete g.document;

  try {
    const res = await copyTextToClipboard('Test text');
    assert.equal(res, false);
  } finally {
    g.window = origWindow;
    g.document = origDoc;
  }
});

test('clipboard: uses navigator.clipboard.writeText when available', async () => {
  let writtenText = '';
  const mockNavigator = {
    clipboard: {
      writeText: async (text: string) => {
        writtenText = text;
      },
    },
  };

  const origNavDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  g.window = {};
  g.document = {};
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true,
  });

  try {
    const success = await copyTextToClipboard('SecretWi-Fi123');
    assert.equal(success, true);
    assert.equal(writtenText, 'SecretWi-Fi123');
  } finally {
    delete g.window;
    delete g.document;
    if (origNavDescriptor) {
      Object.defineProperty(globalThis, 'navigator', origNavDescriptor);
    }
  }
});

test('clipboard: falls back to document.execCommand when navigator.clipboard throws or is blocked', async () => {
  let execCommandCalledWith = '';
  let appendedChild: unknown = null;
  let removedChild: unknown = null;

  const mockTextarea = {
    value: '',
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {},
    setSelectionRange: () => {},
  };

  const mockDoc = {
    createElement: (tag: string) => {
      if (tag === 'textarea') return mockTextarea;
      return {};
    },
    body: {
      appendChild: (el: unknown) => {
        appendedChild = el;
      },
      removeChild: (el: unknown) => {
        removedChild = el;
      },
    },
    execCommand: (command: string) => {
      execCommandCalledWith = command;
      return true;
    },
  };

  const mockNavigator = {
    clipboard: {
      writeText: async () => {
        throw new Error('NotAllowedError: Android WebView denied clipboard write');
      },
    },
  };

  const origNavDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  g.window = {};
  g.document = mockDoc;
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNavigator,
    configurable: true,
    writable: true,
  });

  try {
    const success = await copyTextToClipboard('FallbackDeliveryAddress');
    assert.equal(success, true);
    assert.equal(execCommandCalledWith, 'copy');
    assert.equal(mockTextarea.value, 'FallbackDeliveryAddress');
    assert.equal(appendedChild, mockTextarea);
    assert.equal(removedChild, mockTextarea);
  } finally {
    delete g.window;
    delete g.document;
    if (origNavDescriptor) {
      Object.defineProperty(globalThis, 'navigator', origNavDescriptor);
    }
  }
});
