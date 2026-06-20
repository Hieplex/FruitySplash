import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('map resource font styling', () => {
  it('uses the booster-count text style for energy and coin values', () => {
    const mapScreen = readFileSync(path.join(projectRoot, 'app/map.tsx'), 'utf8');

    expect(mapScreen).toContain('const RESOURCE_TEXT_WEIGHT = \'900\'');
    expect(mapScreen).toContain('fontWeight: RESOURCE_TEXT_WEIGHT');
    expect(mapScreen).not.toContain("fontFamily={fontsLoaded ? 'NunitoSansVariable' : undefined}");
  });
});
