'use strict';

const webpack = require('webpack');
const ExportPropertyLibraryPlugin = require('webpack/lib/library/ExportPropertyLibraryPlugin');
const propertyAccess = require('webpack/lib/util/propertyAccess');

const {
  Template,
  RuntimeGlobals,
  sources: { ConcatSource },
  library: { AbstractLibraryPlugin, EnableLibraryPlugin }
} = webpack;

class PlitziLibraryPlugin extends AbstractLibraryPlugin {
  constructor(options = {}) {
    const { mode = 'plugin', type = 'plitzi' } = options;
    super({ pluginName: 'ModuleLibraryPlugin', type, library: { name: 'test' } });

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

    return {
      name,
      names,
      auxiliaryComment: library.auxiliaryComment,
      namedDefine: library.umdNamedDefine
    };
  }

  apply(compiler) {
    // Enable Custom library
    EnableLibraryPlugin.setEnabled(compiler, 'plitzi');

    // Enable Exports
    new ExportPropertyLibraryPlugin({ type: this.type, nsObjectUsed: this.type !== 'plitzi' }).apply(compiler);

    // Continue with parent apply process
    super.apply(compiler);
  }

  render(source, data, { options }) {
    const { names } = options;

    if (this.type === 'plitzi') {
      const finalName = names.root || names.commonjs || 'plitzi';
      const result = new ConcatSource(
        `var ${finalName} = (function plitziUniversalModuleDefinition() {
          let windowInstance = {};
          if (typeof window !== 'undefined') {
            windowInstance = window;
          }
          return (init, shared, { window  = windowInstance, document = windowInstance.document, Navigator = windowInstance.Navigator, navigator = windowInstance.navigator } = {}) => new Promise((resolve, reject) => {\n`,
        source,
        `\n});
        })();
        if (typeof window !== 'undefined') {
          if (!window.plitziPlugins) {
            window.plitziPlugins = {}
          }

          if (!window.plitziPlugins['${names.root || names.commonjs}']) {
            window.plitziPlugins['${names.root || names.commonjs}'] = ${finalName};
          } else {
            // console.log('${names.root || names.commonjs} already loaded');
          }
        }
        `
      );

      return result;
    }

    return source;
  }

  pluginStartupTemplate() {
    return `try {
      if (init) {
        var modules = init();
        Object.keys(modules).forEach(moduleKey => {
          ${RuntimeGlobals.moduleFactories}[moduleKey] = modules[moduleKey];
        });
      }

      if (shared) {
        var sharedModules = shared();
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

  renderStartup(source, module, { moduleGraph, chunk }) {
    if (this.type === 'plitzi') {
      let result = source;
      if (this.mode === 'plugin') {
        result = new ConcatSource(this.pluginStartupTemplate(), source);
      } else if (this.mode === 'storybook') {
        result = new ConcatSource(this.storybookStartupTemplate(), source);
      }

      const exportsInfo = moduleGraph.getExportsInfo(module);
      const exports = [];
      const isAsync = moduleGraph.isAsync(module);
      if (isAsync) {
        result.add(`__webpack_exports__ = await __webpack_exports__;\n`);
      }

      for (const exportInfo of exportsInfo.orderedExports) {
        if (!exportInfo.provided) {
          continue;
        }

        const varName = `__webpack_exports__${Template.toIdentifier(exportInfo.name)}`;
        result.add(
          `var ${varName} = __webpack_exports__${propertyAccess([
            exportInfo.getUsedName(exportInfo.name, chunk.runtime)
          ])};\n`
        );
        exports.push(`${exportInfo.name}: ${varName}`);
      }

      if (exports.length > 0) {
        result.add(`resolve({ ${exports.join(', ')} });\n`);
      }

      return result;
    }

    return source;
  }
}

module.exports = PlitziLibraryPlugin;
