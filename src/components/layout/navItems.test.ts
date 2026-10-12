import { describe, expect, it } from 'vitest';
import { paths } from '@/lib/routes';
import { NAV_ITEMS } from './navItems';

describe('NAV_ITEMS', () => {
  it('does not link to the upload page', () => {
    expect(NAV_ITEMS.map((item) => item.to)).not.toContain(paths.upload);
  });
});
