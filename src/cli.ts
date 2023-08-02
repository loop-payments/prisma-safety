#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import chalk from 'chalk';
import { program } from 'commander';
import { cosmiconfig } from 'cosmiconfig';
import { glob } from 'glob';

import { parseRules } from '#src/common/parse-rules.js';
import { renderViolations } from '#src/common/render.js';
import { lintPrismaFiles } from '#src/lint-prisma-files.js';
import ruleDefinitions from '#src/rule-definitions.js';

const DEFAULT_PRISMA_FILE_PATH = 'prisma/schema.prisma';

program
  .name('prisma-safety')
  .description('A safe migration checker for Prisma schema files.')
  .option('-s, --schema', 'The path to the Prisma schema file.',
    DEFAULT_PRISMA_FILE_PATH)
  .argument(
    'baseSha',
    'The baseSha to diff the current schema against.',
  );

program.parse();

const explorer = cosmiconfig('prismalint');

const options = program.opts();
const { args } = program;

/* eslint-disable no-console */

const run = async () => {
  assertSafeSchemaChange(arg).catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);

  });
};

run().catch((err) => {
  console.error(err);
  // Something's wrong with prisma-safety.
  process.exit(2);
});
