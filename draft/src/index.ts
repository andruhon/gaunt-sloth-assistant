#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { hiCommand } from './commands/hi.js';

const program = new Command();

program
  .name('zobo')
  .description('A command line utility with LLM capabilities')
  .version('1.0.0');

program
  .command('hi')
  .description('Get a greeting from the LLM')
  .action(hiCommand);

program.parse(); 