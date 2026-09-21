let store = {};

const AsyncStorage = {
  getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, value) => { store[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn(key => { delete store[key]; return Promise.resolve(); }),
  multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, store[k] ?? null]))),
  multiSet: jest.fn(pairs => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
  multiRemove: jest.fn(keys => { keys.forEach(k => delete store[k]); return Promise.resolve(); }),
  clear: jest.fn(() => { store = {}; return Promise.resolve(); }),
  _reset: () => { store = {}; },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
