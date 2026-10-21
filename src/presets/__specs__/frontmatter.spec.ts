import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../frontmatter.ts';

describe('parseFrontmatter', () => {
  it('splits frontmatter and body', () => {
    const text = '---\ndescription: Hi\n---\n# Title\n';

    const result = parseFrontmatter(text, 'a.md');

    expect(result).toEqual({
      data: {
        description: 'Hi',
      },
      body: '# Title\n',
    });
  });

  it('returns the whole text when there is no frontmatter', () => {
    const text = '# Title\n';

    const result = parseFrontmatter(text, 'a.md');

    expect(result).toEqual({
      data: {},
      body: '# Title\n',
    });
  });

  it('accepts empty frontmatter', () => {
    const text = '---\n---\nText';

    const result = parseFrontmatter(text, 'a.md');

    expect(result).toEqual({
      data: {},
      body: 'Text',
    });
  });

  it('rejects frontmatter that is not key-value pairs', () => {
    const text = '---\n- a\n- b\n---\n';

    const act = () => parseFrontmatter(text, 'a.md');

    expect(act).toThrow('key-value pairs');
  });

  it.each([
    ['a number', '42'],
    ['a string', 'text'],
  ])('rejects frontmatter that is %s', (_, yaml) => {
    const text = `---\n${yaml}\n---\n`;

    const act = () => parseFrontmatter(text, 'a.md');

    expect(act).toThrow('key-value pairs');
  });

  it('treats null frontmatter as empty', () => {
    const text = '---\nnull\n---\nText';

    const result = parseFrontmatter(text, 'a.md');

    expect(result).toEqual({
      data: {},
      body: 'Text',
    });
  });

  it('names the file when YAML is broken', () => {
    const text = '---\nkey: [\n---\n';

    const act = () => parseFrontmatter(text, 'a.md');

    expect(act).toThrow('a.md');
  });
});
