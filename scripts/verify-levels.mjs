import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const projectRoot = process.cwd();
const sourceFiles = [
  'src/game/levels/schema.ts',
  'src/game/levels/level-generator.ts',
  'src/game/levels/levels.ts',
];

function transpileModule(sourceText, sourcePath) {
  const { outputText } = ts.transpileModule(sourceText, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });

  return outputText
    .replaceAll('.ts', '.js')
    .replace(/from\s+['"](\.\/[^'".]+)['"]/g, "from '$1.js'");
}

async function compileLevelModules(tempRoot) {
  await writeFile(
    path.join(tempRoot, 'package.json'),
    JSON.stringify({ type: 'module' }, null, 2),
    'utf8',
  );

  for (const relativeFile of sourceFiles) {
    const sourcePath = path.join(projectRoot, relativeFile);
    const outputPath = path.join(tempRoot, relativeFile).replace(/\.ts$/, '.js');
    const sourceText = await readFile(sourcePath, 'utf8');
    const compiled = transpileModule(sourceText, sourcePath);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, compiled, 'utf8');
  }
}

async function main() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'fruity-splash-levels-'));

  try {
    await compileLevelModules(tempRoot);

    const schemaModule = await import(
      pathToFileURL(path.join(tempRoot, 'src/game/levels/schema.js')).href
    );
    const levelsModule = await import(
      pathToFileURL(path.join(tempRoot, 'src/game/levels/levels.js')).href
    );

    schemaModule.validateLevelCollection(levelsModule.LEVELS);

    const bandCounts = schemaModule.DIFFICULTY_BANDS.map((band) => ({
      band,
      count: levelsModule.LEVELS.filter((level) => level.difficultyBand === band).length,
    }));

    console.log(
      `Verified ${levelsModule.LEVELS.length} Fruity Splash levels successfully.`,
    );

    for (const { band, count } of bandCounts) {
      console.log(`${band}: ${count}`);
    }
  } catch (error) {
    console.error('Level verification failed.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
