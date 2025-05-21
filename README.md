# prisma-safety

A safe schema change checker for Prisma. Errors if a model is deleted without previously having been marked `@@ignore` or a field is deleted without previously having been marked `@ignore`.

## Motivation

<https://github.com/prisma/prisma/discussions/13922>

## Installation

```sh
> npm install --save-dev prisma-safety
# or
> yarn add --dev prisma-safety
```

## Usage

```sh
> npx prisma-safety <base-sha>
# or
> yarn prisma-safety <base-sha>
```

A schema file path can be specified with the `-s, --schema` option. The default path is `prisma/schema.prisma`.

Run `yarn prisma-safety --help` for more.

### CLI

Example usage locally from CLI:

```sh
> yarn prisma-safety d282130914405c7055a360834229dc5ae00fbc73
Unsafe change to "LineItem.invoiceId": Expected deleted field to have been marked with @ignore prior to delete.
```

### GitHub Actions

Example usage in GitHub Actions:

```yaml
jobs:
  prisma-safety:
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18.13.0'
          cache: 'yarn'
      - run: yarn
      - name: Check Prisma schema change safety
        run: |
          # Even though we don't diff again main's HEAD, we need to fetch it
          # because the base SHA is not fetched as part of the shallow clone
          # GitHub Actions uses to fetch the PR branch HEAD.
          git fetch origin ${{ github.base_ref }}
          yarn prisma-safety ${{ github.event.pull_request.base.sha }}
```

## Related package

You might also find value in [prisma-lint](https://github.com/loop-payments/prisma-lint). It has some safety-related rules such as [ban-unbounded-string-type](https://github.com/loop-payments/prisma-lint/blob/main/RULES.md#ban-unbounded-string-type) and [forbid-required-ignored-field](https://github.com/loop-payments/prisma-lint/blob/main/RULES.md#forbid-required-ignored-field). Guidance for what goes where:

- `prisma-lint` - anything that can be linted by looking at a single Prisma schema in isolation
- `prisma-safety` - requires the current and draft version of the Prisma schema, and looking at the diff
