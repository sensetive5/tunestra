#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { VERSION } from '../index.ts';
import { runSetupCommand } from './setup-command.ts';

const program = new Command()
  .name('tunestra')
  .description('Tune your AI agents to play as one orchestra.')
  .version(VERSION);

program
  .command('setup')
  .description('Generate agent configuration from tunestra.yaml and its presets')
  .option('--dry-run', 'show the plan without writing files', false)
  .action(async (options) => {
    const projectDir = process.cwd();

    await runSetupCommand(projectDir, options);
  });

await program.parseAsync();
