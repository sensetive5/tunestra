#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { VERSION } from '../index.ts';
import type { UpdateTarget } from '../lock/select-updated.ts';
import { describeInit } from './commands/init.ts';
import { describeSetup } from './commands/setup.ts';
import { describeUninstall } from './commands/uninstall.ts';
import { runCommand } from './run-command.ts';

const program = new Command()
  .name('tunestra')
  .description('Tune your AI agents to play as one orchestra.')
  .version(VERSION);

program
  .command('init')
  .description('Create tunestra.yaml and move hand-written AGENTS.md and CLAUDE.md to .tunestra/')
  .option('--extends <presets...>', 'presets to extend, from general to specific', [])
  .option(
    '--local',
    'create only your personal level: tunestra.local.yaml and .tunestra.local/',
    false,
  )
  .action(async (options) => {
    const projectDir = process.cwd();
    const initOptions = {
      presets: options.extends,
      local: options.local,
    };

    await runCommand(() => describeInit(projectDir, initOptions));
  });

program
  .command('setup')
  .description('Generate agent configuration from tunestra.yaml and its presets')
  .option('--dry-run', 'show the plan without writing files', false)
  .option('-v, --verbose', 'show where every artifact comes from', false)
  .action(async (options) => {
    const projectDir = process.cwd();

    await runCommand(() => describeSetup(projectDir, options));
  });

program
  .command('update')
  .description('Move git presets to the latest commit of their refs and run setup')
  .argument('[sources...]', 'git sources to update, like github:org/presets#v1; all by default')
  .option('--dry-run', 'show the plan without writing files', false)
  .option('--summary', 'print only a markdown table of the changes, for a pull request', false)
  .action(async (sources, options) => {
    const projectDir = process.cwd();
    const update: UpdateTarget = sources.length === 0 ? 'all' : sources;
    const setupOptions = {
      dryRun: options.dryRun,
      verbose: false,
      summary: options.summary,
      update,
    };

    await runCommand(() => describeSetup(projectDir, setupOptions));
  });

program
  .command('uninstall')
  .description('Remove everything tunestra generated; tunestra.yaml and .tunestra/ stay')
  .option('--dry-run', 'show what would be removed without removing it', false)
  .action(async (options) => {
    const projectDir = process.cwd();

    await runCommand(() => describeUninstall(projectDir, options));
  });

await program.parseAsync();
