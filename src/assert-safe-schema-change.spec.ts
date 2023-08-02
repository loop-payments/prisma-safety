
import { getSchema } from '@mrleebo/prisma-ast';

import {
  assertSafeSchemaChangeBasedOnSchemas,
  UnsafeSchemaChangeError,
} from './assert-safe-schema-change';

describe('safe schema change', () => {
  describe('assertSafeSchemaChange', () => {
    describe('unsafe', () => {
      it('throws when fields deleted from table without being ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar")
        }`);
        const current = getSchema(`model Foo {
          qid String @id
        }`);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).toThrowError(UnsafeSchemaChangeError);
      });

      it('throws when fields renamed in table without being ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar")
        }`);
        const current = getSchema(`model Foo {
          qid String @id
          baz String @map(name: "bar") @ignore
        }`);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).toThrowError(UnsafeSchemaChangeError);
      });

      it('throws when table is deleted without being ignored', () => {
        const prev = getSchema(`
          model Foo {
            qid String @id
            bar String @map(name: "bar")
          }
          model Bar {
            qid String @id
          }
        `);
        const current = getSchema(`
          model Foo {
            qid String @id
            bar String @map(name: "bar")
          }
        `);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).toThrowError(UnsafeSchemaChangeError);
      });
    });

    describe('safe', () => {
      it('allows deleting field that was marked as ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar") @ignore
        }`);
        const current = getSchema(`model Foo {
          qid String @id
        }`);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });

      it('allows moving existing field within model', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar")
        }`);
        const current = getSchema(`model Foo {
          bar String @map(name: "bar")
          qid String @id
        }`);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });

      it('allows renaming field that was marked as ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar") @ignore
        }`);
        const current = getSchema(`model Foo {
          qid String @id
          baz String @map(name: "baz")
        }`);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });

      it('allows deleting relations', () => {
        const prev = getSchema(`
          model Foo {
            qid String @id
            barQid String @map(name: "bar_qid")
            bar Bar @relation(fields: [barQid], references: [qid])
          }
          model Bar {
            qid String @id
            foos Foo[]
          }
        `);
        const current = getSchema(`
        model Foo {
          qid String @id
          barQid String @map(name: "bar_qid")
        }
        model Bar {
          qid String @id
        }
      `);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });

      it('ignores if comment', () => {
        const prev = getSchema(`
          model Foo {
            ///no-tenant-field
            qid String @id
            bar String @map(name: "bar")
          }
        `);
        const current = getSchema(`
          model Foo {
            // TODO(P6M-266): Make tenant QID non-nullable.
            qid String @id
            bar String @map(name: "bar")
          }
        `);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });

      it('allows deleting table that was ignored', () => {
        const prev = getSchema(`
          model Foo {
            qid String @id
            bar String @map(name: "bar")
          }
          model Bar {
            qid String @id
            @@ignore
          }
        `);
        const current = getSchema(`
          model Foo {
            qid String @id
            bar String @map(name: "bar")
          }
        `);
        expect(() =>
          assertSafeSchemaChangeBasedOnSchemas(prev, current),
        ).not.toThrow();
      });
    });
  });
});

