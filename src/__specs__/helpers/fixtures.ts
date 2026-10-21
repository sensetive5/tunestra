import { join, resolve } from 'node:path';

export const FIXTURES_DIR = resolve('src/__specs__/fixtures');

/** Input of the basic fixture: presets/base, presets/team and project. */
export const BASIC_INPUT = join(FIXTURES_DIR, 'basic/input');
