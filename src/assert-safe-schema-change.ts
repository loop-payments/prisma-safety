import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import { promisify } from 'util';

import {
  type Field,
  type GroupedBlockAttribute,
  type Model,
  type BlockAttribute,
  type Schema,
  getSchema,
} from '@mrleebo/prisma-ast';

export class UnsafeSchemaChangeError extends Error {
  constructor(issues: Issue[]) {
    super(
      `Unsafe schema change:\n ${issues
        .map(
          (issue) =>
            `"Diff "${[issue.model, issue.field].filter(Boolean).join('.')}": ${
              issue.message
            }`,
        )
        .join('\n')}`,
    );
  }
}

type Issue = {
  model: string;
  field?: string;
  message: string;
};

export async function assertSafeSchemaChange(
  schemaPath: string,
  baseSha: string,
) {
  const safeSha = baseSha.replace(/\W/g, '');

  const [currentSchema, previousSchema] = await Promise.all([
    readFile(schemaPath, { encoding: 'utf8' }).then((content) => {
      return getSchema(content);
    }),
    promisify(exec)(`git show ${safeSha}:${schemaPath}`).then(
      ({ stdout, stderr }) => {
        if (stderr !== '') {
          throw new Error(`Unexpected stderr: ${stderr}`);
        }

        return getSchema(stdout);
      },
    ),
  ]);

  assertSafeSchemaChangeBasedOnSchemas(previousSchema, currentSchema);
}

export function assertSafeSchemaChangeBasedOnSchemas(
  previousSchema: Schema,
  currentSchema: Schema,
) {
  const allIssues = [];
  const currentTables = tablesFromSchema(currentSchema);

  const tableChanges = diffModels(previousSchema, currentSchema);
  allIssues.push(
    ...tableChanges.deleted.flatMap((model) => {
      const issues = [];
      // The table is deleted but not ignored at the table level
      const ignoreAttr = attributesFromModel(model).find(
        ({ name }) => name === 'ignore',
      );
      if (!ignoreAttr) {
        issues.push({
          model: model.name,
          message:
            'Expected a deleted table to be marked with @@ignore prior to deletion.',
        });
      }

      return issues;
    }),
  );

  const isFieldARelation = (field: Field): boolean => {
    if (typeof field.fieldType === 'string') {
      if (currentTables.has(field.fieldType)) {
        return true;
      }
    }

    return false;
  };

  allIssues.push(
    ...tableChanges.remaining.flatMap(({ current, prev }) => {
      const fieldChanges = diffModelFields(prev, current);

      const issues = [];

      issues.push(
        ...fieldChanges.deleted.flatMap((field) => {
          const issues = [];

          // Deleting relations is not a breaking change
          if (!isFieldARelation(field)) {
            const ignoreAttr = field.attributes?.find(
              ({ name }) => name === 'ignore',
            );
            if (!ignoreAttr) {
              issues.push({
                model: current.name,
                field: field.name,
                message:
                  'Expected deleted field to have been marked with @ignore prior to delete.',
              });
            }
          }

          return issues;
        }),
      );

      return issues;
    }),
  );

  if (allIssues.length > 0) {
    throw new UnsafeSchemaChangeError(allIssues);
  }
}

function tablesFromSchema(schema: Schema): Map<string, Model> {
  const tables = new Map();
  for (const block of schema.list) {
    if (block.type === 'model') {
      tables.set(block.name, block);
    }
  }

  return tables;
}

type Diff<T> = {
  added: Array<T>;
  deleted: Array<T>;
  remaining: Array<{
    prev: T;
    current: T;
  }>;
};

function diffModels(
  previousSchema: Schema,
  currentSchema: Schema,
): Diff<Model> {
  const previousTables = tablesFromSchema(previousSchema);
  const currentTables = tablesFromSchema(currentSchema);

  return diffMaps(previousTables, currentTables);
}

function fieldsFromModel(model: Model): Map<string, Field> {
  const fields = new Map();
  for (const prop of model.properties) {
    if (prop.type === 'field') {
      fields.set(prop.name, prop);
    }
  }

  return fields;
}

function diffModelFields(
  previousSchema: Model,
  currentSchema: Model,
): Diff<Field> {
  const previousFields = fieldsFromModel(previousSchema);
  const currentFields = fieldsFromModel(currentSchema);

  return diffMaps(previousFields, currentFields);
}

function diffMaps<T>(
  previousMap: Map<string, T>,
  currentMap: Map<string, T>,
): Diff<T> {
  const added = [];
  const deleted = [];
  const remaining = [];

  const currentKeys = new Set(currentMap.keys());

  for (const [name, model] of previousMap) {
    const current = currentMap.get(name);
    if (current) {
      remaining.push({
        prev: model,
        current,
      });
      currentKeys.delete(name);
    } else {
      deleted.push(model);
    }
  }

  for (const name of currentKeys) {
    const model = currentMap.get(name);
    if (model) {
      added.push(model);
    }
  }

  return {
    added,
    deleted,
    remaining,
  };
}

function attributesFromModel(
  model: Model,
): Array<BlockAttribute | GroupedBlockAttribute> {
  const attributes = [];
  for (const prop of model.properties) {
    if (prop.type === 'attribute') {
      attributes.push(prop);
    }
  }

  return attributes;
}
