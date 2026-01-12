# Changelog

## Unreleased

- Add support for `prisma.config.ts` schema path (Prisma 7+).

## 0.0.8 (2025-06-10)

- `baseSha` is now an optional argument.

## 0.0.7 (2025-06-10)

- Add support for `-p, --previous-schema <path>` as alternative to `baseSha` argument.

## 0.0.6 (2024-10-22)

- Use model name instead of mapped table name (if present) for determining if field is a relation.

## 0.0.5 (2024-08-21)

- Use mapped table name (when present) to match old and new models for detecting changes.

## 0.0.4 (2023-08-23)

- Add support for reading prisma schema configuration from `package.json`.

## 0.0.3 (2023-08-02)

- Fix release name.

## 0.0.2 (2023-08-02)

- Enable automated publishing.

## 0.0.1 (2023-08-02)

- Add initial skeleton code.
