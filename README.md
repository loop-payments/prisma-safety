# prisma-safety

A safe schema change checker for Prisma. Errors if a model is deleted without previously having been marked `@@ignore` or a field is deleted without previously having been marked `@ignore`.

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
      # Ensure no unsafe Prisma schema changes have been made.
      - name: Assert safe Prisma schema change
        run: |
          # Even though we don't diff again main's HEAD, we need to fetch it
          # because the base SHA is not fetched as part of the shallow clone
          # GitHub Actions uses to fetch the PR branch HEAD.
          git fetch origin main
          yarn prisma-safety ${{ github.event.pull_request.base.sha }}
```

## Inspiration

- https://github.com/prisma/prisma/discussions/13922
- https://github.com/ankane/strong_migrations
