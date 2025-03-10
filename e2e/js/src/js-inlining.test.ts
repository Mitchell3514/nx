import {
  checkFilesExist,
  cleanupProject,
  newProject,
  readFile,
  runCLI,
  uniq,
  updateFile,
} from '@nrwl/e2e/utils';
import { execSync } from 'child_process';

describe('inlining', () => {
  let scope: string;

  beforeEach(() => {
    scope = newProject();
  });

  afterEach(() => cleanupProject());

  it.each(['tsc', 'swc'])(
    'should inline libraries with --compiler=%s',
    async (compiler) => {
      const parent = uniq('parent');
      runCLI(
        `generate @nrwl/js:lib ${parent} --compiler=${compiler} --no-interactive`
      );

      const buildable = uniq('buildable');
      runCLI(`generate @nrwl/js:lib ${buildable} --no-interactive`);

      const buildableTwo = uniq('buildabletwo');
      runCLI(`generate @nrwl/js:lib ${buildableTwo} --no-interactive`);

      const nonBuildable = uniq('nonbuildable');
      runCLI(
        `generate @nrwl/js:lib ${nonBuildable} --buildable=false --no-interactive`
      );

      updateFile(`libs/${parent}/src/lib/${parent}.ts`, () => {
        return `
import { ${buildable} } from '@${scope}/${buildable}';
import { ${buildableTwo} } from '@${scope}/${buildableTwo}';
import { ${nonBuildable} } from '@${scope}/${nonBuildable}';

export function ${parent}() {
  ${buildable}();
  ${buildableTwo}();
  ${nonBuildable}();
}
        `;
      });

      // 1. external is set to all
      execSync(`rm -rf dist`);
      runCLI(`build ${parent} --external=all`);
      checkFilesExist(
        `dist/libs/${buildable}/src/index.js`, // buildable
        `dist/libs/${buildableTwo}/src/index.js`, // buildable two
        `dist/libs/${parent}/src/index.js`, // parent
        `dist/libs/${parent}/${nonBuildable}/src/index.js` // inlined non buildable
      );
      // non-buildable lib import path is modified to relative path
      let fileContent = readFile(`dist/libs/${parent}/src/lib/${parent}.js`);
      expect(fileContent).toContain(`${nonBuildable}/src`);

      // 2. external is set to none
      execSync(`rm -rf dist`);
      runCLI(`build ${parent} --external=none`);
      checkFilesExist(
        `dist/libs/${parent}/src/index.js`, // parent
        `dist/libs/${parent}/${buildable}/src/index.js`, // inlined buildable
        `dist/libs/${parent}/${buildableTwo}/src/index.js`, // inlined buildable two
        `dist/libs/${parent}/${nonBuildable}/src/index.js` // inlined non buildable
      );
      fileContent = readFile(`dist/libs/${parent}/src/lib/${parent}.js`);
      expect(fileContent).toContain(`${nonBuildable}/src`);
      expect(fileContent).toContain(`${buildable}/src`);
      expect(fileContent).toContain(`${buildableTwo}/src`);

      // 3. external is set to an array of libs
      execSync(`rm -rf dist`);
      runCLI(`build ${parent} --external=${buildable}`);
      checkFilesExist(
        `dist/libs/${buildable}/src/index.js`, // buildable
        `dist/libs/${buildableTwo}/src/index.js`, // buildable two original output should be persisted
        `dist/libs/${parent}/src/index.js`, // parent
        `dist/libs/${parent}/${buildableTwo}/src/index.js`, // inlined buildable two
        `dist/libs/${parent}/${nonBuildable}/src/index.js` // inlined non buildable
      );
      fileContent = readFile(`dist/libs/${parent}/src/lib/${parent}.js`);
      expect(fileContent).toContain(`${nonBuildable}/src`);
      expect(fileContent).toContain(`${buildableTwo}/src`);
      expect(fileContent).not.toContain(`${buildable}/src`);
    },
    240_000
  );

  it('should inline nesting libraries', async () => {
    const parent = uniq('parent');
    runCLI(`generate @nrwl/js:lib ${parent} --no-interactive`);

    const child = uniq('child');
    runCLI(`generate @nrwl/js:lib ${child} --buildable=false --no-interactive`);

    const grandChild = uniq('grandchild');
    runCLI(
      `generate @nrwl/js:lib ${grandChild} --buildable=false --no-interactive`
    );

    updateFile(`libs/${parent}/src/lib/${parent}.ts`, () => {
      return `
import { ${child} } from '@${scope}/${child}';

export function ${parent}() {
  ${child}();
}
        `;
    });

    updateFile(`libs/${child}/src/lib/${child}.ts`, () => {
      return `
import { ${grandChild} } from '@${scope}/${grandChild}';

export function ${child}() {
  ${grandChild}();
}
        `;
    });

    runCLI(`build ${parent} --external=all`);
    checkFilesExist(
      `dist/libs/${parent}/src/index.js`, // parent
      `dist/libs/${parent}/${child}/src/index.js`, // inlined child
      `dist/libs/${parent}/${grandChild}/src/index.js` // inlined grand child
    );
    // non-buildable lib import path is modified to relative path
    const parentFileContent = readFile(
      `dist/libs/${parent}/src/lib/${parent}.js`
    );
    expect(parentFileContent).toContain(`${child}/src`);
    expect(parentFileContent).not.toContain(`${grandChild}/src`);

    const childFileContent = readFile(
      `dist/libs/${parent}/${child}/src/lib/${child}.js`
    );
    expect(childFileContent).toContain(`${grandChild}/src`);
  }, 240_000);
});
