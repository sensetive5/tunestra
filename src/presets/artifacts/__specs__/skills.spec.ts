import { describe, expect, it } from 'vitest';
import { createTree } from '../../../shared/tests/temp.ts';
import { loadSkills } from '../skills.ts';

describe('loadSkills', () => {
  it('takes the key from the name in SKILL.md', async () => {
    const dir = await createTree({
      'skills/folder/SKILL.md': '---\nname: review\ndescription: Review code\n---\n',
    });

    const [skill] = await loadSkills(dir);

    expect(skill?.key).toBe('review');
    expect(skill?.source).toBe('skills/folder');
  });

  it('uses the folder name when SKILL.md has no name', async () => {
    const dir = await createTree({
      'skills/review/SKILL.md': '---\ndescription: Review code\n---\n',
    });

    const [skill] = await loadSkills(dir);

    expect(skill?.key).toBe('review');
  });

  it('lists every file of the skill, dotfiles included', async () => {
    const dir = await createTree({
      'skills/review/SKILL.md': '---\ndescription: Review code\n---\n',
      'skills/review/scripts/check.sh': 'echo ok',
      'skills/review/.config': 'a: 1',
    });

    const [skill] = await loadSkills(dir);

    expect(skill?.files).toEqual(['.config', 'SKILL.md', 'scripts/check.sh']);
  });

  it('requires a description', async () => {
    const dir = await createTree({
      'skills/a/SKILL.md': '---\nname: a\n---\nText',
    });

    const result = loadSkills(dir);

    await expect(result).rejects.toThrow('description');
  });

  it('rejects names that are not safe directory names', async () => {
    const dir = await createTree({
      'skills/a/SKILL.md': '---\nname: ../../etc\ndescription: Bad\n---\n',
    });

    const result = loadSkills(dir);

    await expect(result).rejects.toThrow('lowercase letters');
  });

  it('rejects a folder name that is not a safe skill name', async () => {
    const dir = await createTree({
      'skills/Code Review/SKILL.md': '---\ndescription: Review code\n---\n',
    });

    const result = loadSkills(dir);

    await expect(result).rejects.toThrow('skill folder skills/Code Review');
  });

  it('rejects two skills with the same name', async () => {
    const dir = await createTree({
      'skills/a/SKILL.md': '---\nname: same\ndescription: A\n---\n',
      'skills/b/SKILL.md': '---\nname: same\ndescription: B\n---\n',
    });

    const result = loadSkills(dir);

    await expect(result).rejects.toThrow('Skills skills/a and skills/b');
  });
});
