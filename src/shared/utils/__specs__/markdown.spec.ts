import { describe, expect, it } from 'vitest';
import { renderTable } from '../markdown.ts';

describe('renderTable', () => {
  it('renders a header, a separator and rows', () => {
    const header = ['Rule', 'Level'];
    const rows = [['security', 'base']];

    const table = renderTable(header, rows);

    expect(table).toBe('| Rule | Level |\n|---|---|\n| security | base |');
  });

  it('escapes pipes and joins lines inside a cell', () => {
    const header = ['Description'];
    const rows = [['a | b\nc']];

    const table = renderTable(header, rows);

    expect(table).toBe('| Description |\n|---|\n| a \\| b c |');
  });
});
