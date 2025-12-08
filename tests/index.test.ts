import { describe, it, expect } from 'vitest';

describe('Lark Calendar App', () => {
  it('should be able to import main function', async () => {
    const { main } = await import('../src/index.js');
    expect(main).toBeDefined();
    expect(typeof main).toBe('function');
  });
});
