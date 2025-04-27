// jest.setup.js
const { TextDecoder, TextEncoder } = require('util');

// Polyfill TextDecoder and TextEncoder for jsdom
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

console.log('Jest setup: TextDecoder and TextEncoder polyfills applied');