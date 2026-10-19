#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { VERSION } from '../index.ts';

const program = new Command()
  .name('tunestra')
  .description('Tune your AI agents to play as one orchestra.')
  .version(VERSION);

program
  .command('setup')
  .description('Generate agent configuration from tunestra.yaml and its presets')
  .option('--dry-run', 'show the plan without writing files')
  .option('-v, --verbose', 'show where every artifact comes from')
  .action(() => {
    throw new Error('Not implemented yet');
  });

await program.parseAsync();
