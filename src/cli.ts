#!/usr/bin/env node

import { program } from 'commander';

import { readPackageUp } from 'read-package-up';

import {
  listSafetyIssuesBasedOnSchemaPaths,
  listSafetyIssuesBasedOnSha,
  renderSafetyIssues,
} from '#src/prisma-safety.js';

const DEFAULT_PRISMA_FILE_PATH = 'prisma/schema.prisma';

program
  .name('prisma-safety')
  .description('A safe migration checker for Prisma schema files.')
  .option('-s, --schema <path>', 'The path to the Prisma schema file.')
  .option(
    '-p, --previous-schema <path>',
    'The path to the previous Prisma schema file. Alternative to the base sha argument.',
  )
  .argument('[baseSha]', 'The baseSha to diff the current schema against. Only required if --previous-schema is not provided.');

program.parse();

const options = program.opts();
const { args } = program;

/* eslint-disable no-console */

const getSchemaFromPackageJson = async (cwd: string) => {
  const pkgJson = await readPackageUp({ cwd });
  return pkgJson?.packageJson?.prisma?.schema;
};

const getSchemaPath = async () => {
  const schemaFromOption = options.schema;
  if (schemaFromOption) {
    return schemaFromOption;
  }

  const schemaFromPackageJson = await getSchemaFromPackageJson(process.cwd());
  if (schemaFromPackageJson) {
    return schemaFromPackageJson;
  }

  return DEFAULT_PRISMA_FILE_PATH;
};

const run = async () => {
  const baseSha = args[0];
  const schemaPath = await getSchemaPath();
  const previousSchemaPath = options.previousSchema;
  if (baseSha == null && previousSchemaPath == null) {
    console.error(
      'You must provide a base SHA or a previous schema file path.',
    );
    process.exit(1);
  }
  const safetyIssues =
    previousSchemaPath != null
      ? await listSafetyIssuesBasedOnSchemaPaths(schemaPath, previousSchemaPath)
      : await listSafetyIssuesBasedOnSha(schemaPath, baseSha);
  if (safetyIssues.length > 0) {
    console.error(renderSafetyIssues(safetyIssues));
    process.exit(1);
  }
};

run().catch((err) => {
  console.error(err);
  // Something's wrong with prisma-safety.
  process.exit(2);
});
