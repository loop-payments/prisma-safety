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
  type KeyValue,
} from '@mrleebo/prisma-ast';

type SafetyIssue = {
  model: string;
  field?: string;
  message: string;
};

export function renderSafetyIssues(issues: SafetyIssue[]) {
  return issues
    .map(
      (issue) =>
        `Unsafe change to "${[issue.model, issue.field]
          .filter(Boolean)
          .join('.')}": ${issue.message}`,
    )
    .join('\n');
}

export async function listSafetyIssuesBasedOnSha(
  schemaPath: string,
  baseSha: string,
): Promise<SafetyIssue[]> {
  const safeSha = baseSha.replace(/\W/g, '');

  const [currentSchema, previousSchema] = await Promise.all([
    readFile(schemaPath, { encoding: 'utf8' }).then(getSchema),
    promisify(exec)(`git show ${safeSha}:${schemaPath}`).then(
      ({ stdout, stderr }) => {
        if (stderr !== '') {
          throw new Error(`Unexpected stderr: ${stderr}`);
        }

        return getSchema(stdout);
      },
    ),
  ]);

  return listSafetyIssuesBasedOnSchemas(previousSchema, currentSchema);
}

export async function listSafetyIssuesBasedOnSchemaPaths(
  currentPath: string,
  previousPath: string,
) {
  const [currentSchema, previousSchema] = await Promise.all([
    readFile(currentPath, { encoding: 'utf8' }).then(getSchema),
    readFile(previousPath, { encoding: 'utf8' }).then(getSchema),
  ]);
  return listSafetyIssuesBasedOnSchemas(previousSchema, currentSchema);
}

export function listSafetyIssuesBasedOnSchemas(
  previousSchema: Schema,
  currentSchema: Schema,
): SafetyIssue[] {
  const allIssues = [];
  const currentModels = modelsFromSchema(currentSchema);

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
      if (currentModels.has(field.fieldType)) {
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

  return allIssues;
}

const getMappedTableName = (model: Model) => {
  // Get the attribute property for the table mapping.
  const dbMapping = model?.properties?.find(
    (p) => p.type === 'attribute' && p.name === 'map',
  ) as BlockAttribute;
  if (!dbMapping) {
    return null;
  }
  // Get the table name from the attribute property.
  const dbMappingName = dbMapping.args?.find(
    (a) => a.type === 'attributeArgument',
  )?.value as KeyValue;
  return dbMappingName?.value;
};

/**
 *
 * @param schema
 * @returns Map of table or model name to block
 * We prefer the mapped table name as the table identifier if it exists.
 * Otherwise, we use the model name as the identifier.
 * This is useful for cases where the table mapping doesn't change, but the model name does.
 */
function tablesFromSchema(schema: Schema): Map<string, Model> {
  const tables = new Map();
  for (const block of schema.list) {
    if (block.type === 'model') {
      const mappedName = getMappedTableName(block);
      // For safety considerations, what matters is the actual table
      // name, not the model name (used for generated code).
      const tableName = mappedName ?? block.name;
      tables.set(tableName, block);
    }
  }

  return tables;
}

function modelsFromSchema(schema: Schema): Map<string, Model> {
  const models = new Map();
  for (const block of schema.list) {
    if (block.type === 'model') {
      models.set(block.name, block);
    }
  }

  return models;
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
