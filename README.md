# prisma-safety

A safe schema change checker for Prisma. It errors if a model is deleted without previously having been marked `@@ignore` or a field is deleted without previously having been marked `@ignore`.

## Installation

```sh
> npm install --save-dev prisma-safety
# or
> yarn add --dev prisma-safety
```

## Usage

```sh
> npx prisma-safety path/to/schema.prisma
# or
> yarn prisma-safety path/to/schema.prisma
```

The arguments can be globs, directories, or file paths. The default path is `prisma/schema.prisma`.

Run `yarn prisma-safety --help` for all options.

### GitHub Actions

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
