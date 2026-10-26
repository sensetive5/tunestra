#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { VERSION } from '../index.ts';
import { describeInit } from './commands/init.ts';
import { describeSetup } from './commands/setup.ts';
import { runCommand } from './run-command.ts';

const program = new Command()
  .name('tunestra')
  .description('Tune your AI agents to play as one orchestra.')
  .version(VERSION);

program
  .command('init')
  .description('Create tunestra.yaml and move hand-written AGENTS.md and CLAUDE.md to .tunestra/')
  .option('--extends <presets...>', 'presets to extend, from general to specific', [])
  .action(async (options) => {
    const projectDir = process.cwd();
    const initOptions = {
      presets: options.extends,
    };

    await runCommand(() => describeInit(projectDir, initOptions));
  });

program
  .command('setup')
  .description('Generate agent configuration from tunestra.yaml and its presets')
  .option('--dry-run', 'show the plan without writing files', false)
  .action(async (options) => {
    const projectDir = process.cwd();

    await runCommand(() => describeSetup(projectDir, options));
  });

await program.parseAsync();
