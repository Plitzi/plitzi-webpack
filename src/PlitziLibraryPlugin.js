'use strict';

const webpack = require('webpack');
const ExportPropertyLibraryPlugin = require('webpack/lib/library/ExportPropertyLibraryPlugin');
const propertyAccess = require('webpack/lib/util/propertyAccess');

const {
  Template,
  ExternalModule,
  RuntimeGlobals,
  sources: { ConcatSource },
  library: { AbstractLibraryPlugin, EnableLibraryPlugin }
} = webpack;

const accessorToObjectAccess = accessor => accessor.map(a => `[${JSON.stringify(a)}]`).join('');

class PlitziLibraryPlugin extends AbstractLibraryPlugin {
  constructor(options = {}) {
    const { mode = 'plugin', type = 'umd' } = options;
    super({ pluginName: 'PlitziLibraryPlugin', type, library: { name: 'Plitzi' } });
    this.mode = mode;
    this.type = type;
  }

  parseOptions(library) {
    let name;
    let names;
    if (typeof library.name === 'object' && !Array.isArray(library.name)) {
      name = library.name.root || library.name.amd || library.name.commonjs;
      names = library.name;
    } else {
      name = library.name;
      const singleName = Array.isArray(name) ? name[0] : name;
      names = { commonjs: singleName, root: library.name, amd: singleName };
    }

    return { name, names, auxiliaryComment: library.auxiliaryComment, namedDefine: library.umdNamedDefine };
  }

  apply(compiler) {
    // Enable Custom library
    EnableLibraryPlugin.setEnabled(compiler, this.type);

    // Enable Exports
    new ExportPropertyLibraryPlugin({ type: this.type, nsObjectUsed: false }).apply(compiler);

    // Continue with parent apply process
    super.apply(compiler);
  }

  getPlitziModuleId = (chunkGraph, chunk) => {
    const plitziModule = chunkGraph.getChunkModules(chunk).find(module => module.rawRequest === '@plitzi/plitzi-sdk');

    if (!plitziModule) {
      return './node_modules/@plitzi/plitzi-sdk/dist/plitzi-sdk.js';
    }

    const plitziModuleParsed = {
      id: chunkGraph.getModuleId(plitziModule),
      rawRequest: plitziModule.rawRequest
      // source: renderModule(module) || "false"
    };

    return plitziModuleParsed.id;
  };

  render(source, { chunkGraph, runtimeTemplate, chunk, moduleGraph }, { options, compilation }) {
    if (this.type === 'umd') {
      const { names } = options;
      const modules = chunkGraph
        .getChunkModules(chunk)
        .filter(m => m instanceof ExternalModule && (m.externalType === 'umd' || m.externalType === 'umd2'));
      let externals = modules;
      const optionalExternals = [];
      let requiredExternals = [];
      if (this.optionalAmdExternalAsGlobal) {
        for (const m of externals) {
          if (m.isOptional(moduleGraph)) {
            optionalExternals.push(m);
          } else {
            requiredExternals.push(m);
          }
        }
        externals = requiredExternals.concat(optionalExternals);
      } else {
        requiredExternals = externals;
      }

      const replaceKeys = str => compilation.getPath(str, { chunk });

      const externalsRequireArray = type => {
        return replaceKeys(
          externals
            .map(m => {
              let expr;
              let { request } = m;
              if (typeof request === 'object') {
                request = request[type];
              }

              if (request === undefined) {
                throw new Error(`Missing external configuration for type: ${type}`);
              }

              if (Array.isArray(request)) {
                expr = `require(${JSON.stringify(request[0])})${accessorToObjectAccess(request.slice(1))}`;
              } else {
                expr = `require(${JSON.stringify(request)})`;
              }

              if (m.isOptional(moduleGraph)) {
                expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
              }

              return expr;
            })
            .join(', ')
        );
      };

      const externalsArguments = modules =>
        modules
          .map(m => `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(`${chunkGraph.getModuleId(m)}`)}__`)
          .join(', ');

      const plitziModuleId = this.getPlitziModuleId(chunkGraph, chunk);
      const finalName = names.root || names.commonjs || 'plitzi';
      const result = new ConcatSource(
        `(function plitziUniversalModuleDefinition(root, factory) {
          const rootInstance = {
            window: root,
            document: root.document,
            Navigator: root.Navigator,
            navigator: root.navigator
          };

          if (typeof exports === 'object' && typeof module === 'object') {
            let __plitziModules__ = ${RuntimeGlobals.moduleCache}['${plitziModuleId}'];
            if (!__plitziModules__) {
              // Inside Plitzi SDK - Nothing To - Do
              module.exports = undefined;
            } else if (__plitziModules__ && __plitziModules__.exports) {
              module.exports = factory(
                undefined,
                () => ${RuntimeGlobals.shareScopeMap},
                __plitziModules__.exports,
                rootInstance,
                [${externalsRequireArray('commonjs2')}]
              );
            }
          } else {
            const ${names.root || names.commonjs} = (
              __init__,
              __shared__,
              __plitziModules__,
              windowInstance = rootInstance,
              externals = []
            ) => factory(__init__, __shared__, __plitziModules__, windowInstance, externals);

            if (!root.plitziPlugins) {
              root.plitziPlugins = {}
            }
  
            if (!root.plitziPlugins['${names.root || names.commonjs}']) {
              root.plitziPlugins['${names.root || names.commonjs}'] = ${finalName};
            }
          }
        })(${runtimeTemplate.outputOptions.globalObject},(
          __init__,
          __shared__,
          __plitziModules__,
          { window, document, Navigator, navigator },
          { ${externalsArguments(externals)} }
        ) => {\nreturn `,
        source,
        ';\n})'
      );

      return result;
    }

    return source;
  }

  pluginStartupTemplate(plitziModuleId) {
    return `try {
      if (__init__ && typeof __init__ === 'function') {
        var modules = __init__();
        Object.keys(modules).forEach(moduleKey => {
          ${RuntimeGlobals.moduleFactories}[moduleKey] = modules[moduleKey];
        });
      }

      if (__plitziModules__) {
        ${RuntimeGlobals.moduleFactories}['${plitziModuleId}'] = (function(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
          Object.keys(__plitziModules__).forEach(moduleKey => {
            __webpack_exports__[moduleKey] = __plitziModules__[moduleKey];
          });
        });
      }

      if (__shared__ && typeof __shared__ === 'function') {
        var sharedModules = __shared__();
        Object.keys(sharedModules).forEach(scopeKey => {
          var scopeSection = ${RuntimeGlobals.shareScopeMap}[scopeKey] || {};
          if (!${RuntimeGlobals.shareScopeMap}[scopeKey]) ${RuntimeGlobals.shareScopeMap}[scopeKey] = scopeSection;
          Object.keys(sharedModules[scopeKey]).forEach(moduleKey => {
            ${RuntimeGlobals.shareScopeMap}[scopeKey][moduleKey] = sharedModules[scopeKey][moduleKey];
          })
        });
      }
    } catch (e) {
      console.log(e);
    }`;
  }

  storybookStartupTemplate() {
    return `if (${RuntimeGlobals.moduleFactories}) {
      ${RuntimeGlobals.moduleFactories}['webpack/container/remote/plitziSdkFederation/usePlitziServiceContext'] = module => {
        const moduleAux = { exports: {} }
        ${RuntimeGlobals.moduleFactories}['webpack/sharing/consume/default/@plitzi/plitzi-sdk/@plitzi/plitzi-sdk'](moduleAux);
        const hostModule = module.id.replace('webpack/container/remote/plitziSdkFederation/', '');
        if (!moduleAux.exports[hostModule]) return;
        module.exports = moduleAux.exports[hostModule];
      }
    }`;
  }

  renderStartup(source, module, { chunkGraph, moduleGraph, chunk }) {
    if (this.type === 'umd') {
      let result = source;
      if (this.mode === 'plugin') {
        const plitziModuleId = this.getPlitziModuleId(chunkGraph, chunk);
        result = new ConcatSource(this.pluginStartupTemplate(plitziModuleId), source);
      } else if (this.mode === 'storybook') {
        result = new ConcatSource(this.storybookStartupTemplate(), source);
      }

      const exportsInfo = moduleGraph.getExportsInfo(module);
      for (const exportInfo of exportsInfo.orderedExports) {
        if (!exportInfo.provided) {
          continue;
        }

        result.add(
          `__webpack_exports__['${Template.toIdentifier(exportInfo.name)}'] = __webpack_exports__${propertyAccess([
            exportInfo.getUsedName(exportInfo.name, chunk.runtime)
          ])};\n`
        );
      }

      return result;
    }

    return source;
  }
}

module.exports = PlitziLibraryPlugin;
