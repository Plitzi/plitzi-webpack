'use strict';

const webpack = require('webpack');

const {
  Template,
  ExternalModule,
  RuntimeGlobals,
  sources: { ConcatSource },
  library: { AbstractLibraryPlugin }
} = webpack;

const accessorToObjectAccess = accessor => accessor.map(a => `[${JSON.stringify(a)}]`).join('');

class PlitziLibraryPlugin extends AbstractLibraryPlugin {
  constructor(options = {}) {
    const { mode = 'plugin', type = 'umd' } = options;
    super({ pluginName: 'PlitziLibraryPlugin', type, library: { name: 'Plitzi' } });
    this.mode = mode;
    this.type = type;
  }

  // Others

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

  getPlitziModuleId = (chunkGraph, chunk) => {
    const plitziModule = chunkGraph.getChunkModules(chunk).find(module => module.rawRequest === '@plitzi/plitzi-sdk');
    if (!plitziModule) {
      return './node_modules/@plitzi/plitzi-sdk/dist/plitzi-sdk.js';
    }

    return chunkGraph.getModuleId(plitziModule);
  };

  pluginRenderTemplate(source, { chunkGraph, runtimeTemplate, chunk, moduleGraph }, { options, compilation }) {
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

    return new ConcatSource(
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
            __plitziModules__,
            windowInstance = rootInstance,
            externals = []
          ) => factory(__plitziModules__, windowInstance, externals);

          if (!root.plitziPlugins) {
            root.plitziPlugins = {}
          }

          if (!root.plitziPlugins['${names.root || names.commonjs}']) {
            root.plitziPlugins['${names.root || names.commonjs}'] = ${finalName};
          }
        }
      })(${runtimeTemplate.outputOptions.globalObject},(
        __plitziModules__,
        { window, document, Navigator, navigator },
        { ${externalsArguments(externals)} }
      ) => {\nreturn `,
      source,
      ';\n})'
    );
  }

  render(source, { chunkGraph, runtimeTemplate, chunk, moduleGraph }, { options, compilation }) {
    if (this.type === 'umd' && this.mode === 'plugin') {
      return this.pluginRenderTemplate(
        source,
        { chunkGraph, runtimeTemplate, chunk, moduleGraph },
        { options, compilation }
      );
    }

    return source;
  }
}

module.exports = PlitziLibraryPlugin;
