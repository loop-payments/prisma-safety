#!/usr/bin/env node

import { program } from 'commander';

import { listSafetyIssues } from '#src/assert-safe-schema-change.js';

const DEFAULT_PRISMA_FILE_PATH = 'prisma/schema.prisma';

program
  .name('prisma-safety')
  .description('A safe migration checker for Prisma schema files.')
  .option(
    '-s, --schema',
    'The path to the Prisma schema file.',
    DEFAULT_PRISMA_FILE_PATH,
  )
  .argument('baseSha', 'The baseSha to diff the current schema against.');

program.parse();

const options = program.opts();
const { args } = program;

/* eslint-disable no-console */

const run = async () => {
  const schemaPath = options.schema;
  const baseSha = args[0];
  listSafetyIssues(schemaPath, baseSha).catch((e) => {
    console.error(e);
    process.exit(1);
  });
};

run().catch((err) => {
  console.error(err);
  // Something's wrong with prisma-safety.
  process.exit(2);
});
