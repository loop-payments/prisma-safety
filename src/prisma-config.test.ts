import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  loadPrismaConfig,
  getSchemaPathFromPrismaConfig,
} from '#src/prisma-config.js';

describe('loadPrismaConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-safety-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true });
  });

  it('returns null when no config file exists', async () => {
    const result = await loadPrismaConfig(tempDir);
    expect(result).toBeNull();
  });

  it('loads prisma.config.mjs in current directory', async () => {
    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await loadPrismaConfig(tempDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(configPath);
  });

  it('loads config in parent directory', async () => {
    const childDir = path.join(tempDir, 'child');
    fs.mkdirSync(childDir);

    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await loadPrismaConfig(childDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(configPath);
  });

  it('loads config in grandparent directory', async () => {
    const childDir = path.join(tempDir, 'child');
    const grandchildDir = path.join(childDir, 'grandchild');
    fs.mkdirSync(childDir);
    fs.mkdirSync(grandchildDir);

    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await loadPrismaConfig(grandchildDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(configPath);
  });

  it('loads .config/prisma.mjs in current directory', async () => {
    const configDir = path.join(tempDir, '.config');
    fs.mkdirSync(configDir);
    const configPath = path.join(configDir, 'prisma.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await loadPrismaConfig(tempDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(configPath);
  });

  it('prefers root-level config over .config directory', async () => {
    const rootConfigPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(rootConfigPath, 'export default {}');

    const configDir = path.join(tempDir, '.config');
    fs.mkdirSync(configDir);
    const dotConfigPath = path.join(configDir, 'prisma.mjs');
    fs.writeFileSync(dotConfigPath, 'export default {}');

    const result = await loadPrismaConfig(tempDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(rootConfigPath);
  });

  it('loads .config/prisma.mjs in parent directory', async () => {
    const childDir = path.join(tempDir, 'child');
    fs.mkdirSync(childDir);

    const configDir = path.join(tempDir, '.config');
    fs.mkdirSync(configDir);
    const configPath = path.join(configDir, 'prisma.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await loadPrismaConfig(childDir);
    expect(result).not.toBeNull();
    expect(result?.filepath).toBe(configPath);
  });
});

describe('getSchemaPathFromPrismaConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prisma-safety-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true });
  });

  it('returns null when no config file exists', async () => {
    const result = await getSchemaPathFromPrismaConfig(tempDir);
    expect(result).toBeNull();
  });

  it('returns null when config file has no schema', async () => {
    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(configPath, 'export default {}');

    const result = await getSchemaPathFromPrismaConfig(tempDir);
    expect(result).toBeNull();
  });

  it('returns schema path from plain object config', async () => {
    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(
      configPath,
      "export default { schema: 'prisma/schema.prisma' }",
    );

    const result = await getSchemaPathFromPrismaConfig(tempDir);
    expect(result).toBe(path.join(tempDir, 'prisma/schema.prisma'));
  });

  it('returns schema path from function config (defineConfig pattern)', async () => {
    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(
      configPath,
      "export default () => ({ schema: 'src/prisma/schema.prisma' })",
    );

    const result = await getSchemaPathFromPrismaConfig(tempDir);
    expect(result).toBe(path.join(tempDir, 'src/prisma/schema.prisma'));
  });

  it('resolves relative schema path from config directory', async () => {
    const childDir = path.join(tempDir, 'child');
    fs.mkdirSync(childDir);

    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(
      configPath,
      "export default { schema: 'prisma/schema.prisma' }",
    );

    const result = await getSchemaPathFromPrismaConfig(childDir);
    // Schema path should be relative to config file location, not cwd
    expect(result).toBe(path.join(tempDir, 'prisma/schema.prisma'));
  });

  it('preserves absolute schema path', async () => {
    const absoluteSchemaPath = '/absolute/path/to/schema.prisma';
    const configPath = path.join(tempDir, 'prisma.config.mjs');
    fs.writeFileSync(
      configPath,
      `export default { schema: '${absoluteSchemaPath}' }`,
    );

    const result = await getSchemaPathFromPrismaConfig(tempDir);
    expect(result).toBe(absoluteSchemaPath);
  });

  it('returns schema path from .config/prisma.mjs', async () => {
    const configDir = path.join(tempDir, '.config');
    fs.mkdirSync(configDir);
    const configPath = path.join(configDir, 'prisma.mjs');
    fs.writeFileSync(
      configPath,
      "export default { schema: '../prisma/schema.prisma' }",
    );

    const result = await getSchemaPathFromPrismaConfig(tempDir);
    // Schema path is relative to config file location (.config directory)
    expect(result).toBe(path.join(tempDir, 'prisma/schema.prisma'));
  });
});
