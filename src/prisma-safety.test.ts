import { getSchema } from '@mrleebo/prisma-ast';

import { listSafetyIssuesBasedOnSchemas } from '#src/prisma-safety.js';

describe('prisma safety', () => {
  describe('listSafetyIssuesBasedOnSchemas', () => {
    describe('unsafe', () => {
      it('disallows fields deleted from table without being ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar")
        }`);
        const current = getSchema(`model Foo {
          qid String @id
        }`);
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(1);
      });

      it('disallows fields renamed in table without being ignored', () => {
        const prev = getSchema(`model Foo {
          qid String @id
          bar String @map(name: "bar")
        }`);
        const current = getSchema(`model Foo {
          qid String @id
          baz String @map(name: "bar") @ignore
        }`);
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(1);
      });

      it('disallows table is deleted without being ignored', () => {
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(1);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
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
        expect(listSafetyIssuesBasedOnSchemas(prev, current).length).toBe(0);
      });
    });
  });
});
