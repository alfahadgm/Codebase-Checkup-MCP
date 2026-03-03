import { describe, it, expect } from 'vitest';
import { createServer } from '../server.js';

describe('createServer', () => {
  it('creates a server without errors', () => {
    const server = createServer();
    expect(server).toBeDefined();
  });
});
