import type { Tree } from '@nrwl/devkit';
import { names } from '@nrwl/devkit';
import { insertImport } from '@nrwl/workspace/src/utilities/ast-utils';
import type { SourceFile } from 'typescript';
import { createSourceFile, ScriptTarget } from 'typescript';
import {
  addImportToModule,
  addProviderToBootstrapApplication,
  addProviderToModule,
} from '../../../utils/nx-devkit/ast-utils';
import type { NormalizedNgRxGeneratorOptions } from './normalize-options';
import { addProviderToRoute } from '../../../utils/nx-devkit/route-utils';

function addRootStoreImport(
  tree: Tree,
  isParentStandalone: boolean,
  route: string,
  sourceFile: SourceFile,
  parentPath: string,
  provideRootStore: string,
  storeForRoot: string
) {
  if (isParentStandalone) {
    if (tree.read(parentPath, 'utf-8').includes('bootstrapApplication')) {
      addProviderToBootstrapApplication(tree, parentPath, provideRootStore);
    } else {
      addProviderToRoute(tree, parentPath, route, provideRootStore);
    }
  } else {
    sourceFile = addImportToModule(tree, sourceFile, parentPath, storeForRoot);
  }
  return sourceFile;
}

function addRootEffectsImport(
  tree: Tree,
  isParentStandalone: boolean,
  route: string,
  sourceFile: SourceFile,
  parentPath: string,
  provideRootEffects: string,
  effectsForEmptyRoot: string
) {
  if (isParentStandalone) {
    if (tree.read(parentPath, 'utf-8').includes('bootstrapApplication')) {
      addProviderToBootstrapApplication(tree, parentPath, provideRootEffects);
    } else {
      addProviderToRoute(tree, parentPath, route, provideRootEffects);
    }
  } else {
    sourceFile = addImportToModule(
      tree,
      sourceFile,
      parentPath,
      effectsForEmptyRoot
    );
  }

  return sourceFile;
}

function addRouterStoreImport(
  tree: Tree,
  sourceFile: SourceFile,
  addImport: (
    source: SourceFile,
    symbolName: string,
    fileName: string,
    isDefault?: boolean
  ) => SourceFile,
  parentPath: string,
  storeRouterModule: string
) {
  sourceFile = addImport(
    sourceFile,
    'StoreRouterConnectingModule',
    '@ngrx/router-store'
  );
  return addImportToModule(tree, sourceFile, parentPath, storeRouterModule);
}

function addStoreForFeatureImport(
  tree: Tree,
  isParentStandalone,
  route: string,
  sourceFile: SourceFile,
  parentPath: string,
  provideStoreForFeature: string,
  storeForFeature: string
) {
  if (isParentStandalone) {
    if (tree.read(parentPath, 'utf-8').includes('bootstrapApplication')) {
      addProviderToBootstrapApplication(
        tree,
        parentPath,
        provideStoreForFeature
      );
    } else {
      addProviderToRoute(tree, parentPath, route, provideStoreForFeature);
    }
  } else {
    sourceFile = addImportToModule(
      tree,
      sourceFile,
      parentPath,
      storeForFeature
    );
  }
  return sourceFile;
}

function addEffectsForFeatureImport(
  tree: Tree,
  isParentStandalone,
  route: string,
  sourceFile: SourceFile,
  parentPath: string,
  provideEffectsForFeature: string,
  effectsForFeature: string
) {
  if (isParentStandalone) {
    if (tree.read(parentPath, 'utf-8').includes('bootstrapApplication')) {
      addProviderToBootstrapApplication(
        tree,
        parentPath,
        provideEffectsForFeature
      );
    } else {
      addProviderToRoute(tree, parentPath, route, provideEffectsForFeature);
    }
  } else {
    sourceFile = addImportToModule(
      tree,
      sourceFile,
      parentPath,
      effectsForFeature
    );
  }
  return sourceFile;
}

export function addImportsToModule(
  tree: Tree,
  options: NormalizedNgRxGeneratorOptions
): void {
  const parentPath = options.module ?? options.parent;
  const sourceText = tree.read(parentPath, 'utf-8');
  let sourceFile = createSourceFile(
    parentPath,
    sourceText,
    ScriptTarget.Latest,
    true
  );

  const isParentStandalone = !sourceText.includes('@NgModule');

  const addImport = (
    source: SourceFile,
    symbolName: string,
    fileName: string,
    isDefault = false
  ): SourceFile => {
    return insertImport(
      tree,
      source,
      parentPath,
      symbolName,
      fileName,
      isDefault
    );
  };

  const dir = `./${names(options.directory).fileName}`;
  const pathPrefix = `${dir}/${names(options.name).fileName}`;
  const reducerPath = `${pathPrefix}.reducer`;
  const effectsPath = `${pathPrefix}.effects`;
  const facadePath = `${pathPrefix}.facade`;

  const constantName = `${names(options.name).constantName}`;
  const effectsName = `${names(options.name).className}Effects`;
  const facadeName = `${names(options.name).className}Facade`;
  const className = `${names(options.name).className}`;
  const propertyName = `${names(options.name).propertyName}`;
  const reducerImports = `* as from${className}`;

  const storeMetaReducers = `metaReducers: []`;

  const storeForRoot = `StoreModule.forRoot({}, {
      ${storeMetaReducers},
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true
      }
    })`;
  const effectsForRoot = `EffectsModule.forRoot([${effectsName}])`;
  const effectsForEmptyRoot = `EffectsModule.forRoot([])`;
  const storeForFeature = `StoreModule.forFeature(from${className}.${constantName}_FEATURE_KEY, from${className}.${propertyName}Reducer)`;
  const effectsForFeature = `EffectsModule.forFeature([${effectsName}])`;
  const storeRouterModule = 'StoreRouterConnectingModule.forRoot()';

  const provideRootStore = `provideStore()`;
  const provideRootEffects = `provideEffects()`;
  const provideEffectsForFeature = `provideEffects(${effectsName})`;
  const provideStoreForFeature = `provideState(from${className}.${constantName}_FEATURE_KEY, from${className}.${propertyName}Reducer)`;

  if (isParentStandalone) {
    sourceFile = addImport(sourceFile, 'provideStore', '@ngrx/store');
    sourceFile = addImport(sourceFile, 'provideState', '@ngrx/store');
    sourceFile = addImport(sourceFile, 'provideEffects', '@ngrx/effects');
  } else {
    sourceFile = addImport(sourceFile, 'StoreModule', '@ngrx/store');
    sourceFile = addImport(sourceFile, 'EffectsModule', '@ngrx/effects');
  }

  // this is just a heuristic
  const hasRouter = sourceText.indexOf('RouterModule') > -1;

  if (options.minimal && options.root) {
    sourceFile = addRootStoreImport(
      tree,
      isParentStandalone,
      options.route,
      sourceFile,
      parentPath,
      provideRootStore,
      storeForRoot
    );
    sourceFile = addRootEffectsImport(
      tree,
      isParentStandalone,
      options.route,
      sourceFile,
      parentPath,
      provideRootEffects,
      effectsForEmptyRoot
    );

    if (hasRouter && !isParentStandalone) {
      sourceFile = addRouterStoreImport(
        tree,
        sourceFile,
        addImport,
        parentPath,
        storeRouterModule
      );
    }
  } else {
    const addCommonImports = (): SourceFile => {
      sourceFile = addImport(sourceFile, reducerImports, reducerPath, true);
      sourceFile = addImport(sourceFile, effectsName, effectsPath);

      if (options.facade) {
        sourceFile = addImport(sourceFile, facadeName, facadePath);
        if (isParentStandalone) {
          if (tree.read(parentPath, 'utf-8').includes('bootstrapApplication')) {
            addProviderToBootstrapApplication(tree, parentPath, facadeName);
          } else {
            addProviderToRoute(tree, parentPath, options.route, facadeName);
          }
        } else {
          sourceFile = addProviderToModule(
            tree,
            sourceFile,
            parentPath,
            facadeName
          );
        }
      }

      return sourceFile;
    };

    if (options.root) {
      sourceFile = addCommonImports();

      sourceFile = addRootStoreImport(
        tree,
        isParentStandalone,
        options.route,
        sourceFile,
        parentPath,
        provideRootStore,
        storeForRoot
      );

      sourceFile = addRootEffectsImport(
        tree,
        isParentStandalone,
        options.route,
        sourceFile,
        parentPath,
        provideRootEffects,
        effectsForRoot
      );

      if (hasRouter && !isParentStandalone) {
        sourceFile = addRouterStoreImport(
          tree,
          sourceFile,
          addImport,
          parentPath,
          storeRouterModule
        );
      }

      sourceFile = addStoreForFeatureImport(
        tree,
        isParentStandalone,
        options.route,
        sourceFile,
        parentPath,
        provideStoreForFeature,
        storeForFeature
      );

      if (isParentStandalone) {
        addEffectsForFeatureImport(
          tree,
          isParentStandalone,
          options.route,
          sourceFile,
          parentPath,
          provideEffectsForFeature,
          effectsForFeature
        );
      }
    } else {
      sourceFile = addCommonImports();

      sourceFile = addStoreForFeatureImport(
        tree,
        isParentStandalone,
        options.route,
        sourceFile,
        parentPath,
        provideStoreForFeature,
        storeForFeature
      );
      sourceFile = addEffectsForFeatureImport(
        tree,
        isParentStandalone,
        options.route,
        sourceFile,
        parentPath,
        provideEffectsForFeature,
        effectsForFeature
      );
    }
  }
}
