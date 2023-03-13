// Packages
const webpack = require('webpack');
const fs = require('fs');

// Relatives
const PlitziHostPluginModule = require('./PlitziHostPluginModule');
const PlitziHostPluginRuntime = require('./PlitziHostPluginRuntime');
const PlitziStorybookPluginRuntime = require('./PlitziStorybookPluginRuntime');
const { getUsedModuleIdsAndModules } = require('./helpers/utils');
const PlitziLibraryPlugin = require('./PlitziLibraryPlugin');

const slashCode = '/'.charCodeAt(0);

class PlitziPlugin {
  constructor(options) {
    this._options = {
      isPlugin: false,
      isHost: false,
      isStorybook: false,
      libraryTarget: 'plitzi',
      hostName: 'plitziSdkFederation',
      shared: {
        react: { singleton: true, requiredVersion: false, eager: true },
        'react-dom': { singleton: true, requiredVersion: false, eager: true }
      },
      exposes: [],
      shareScope: undefined,
      ...options
    };
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    const { _options: options } = this;
    const { hostName, isPlugin, isHost, isStorybook, shared, shareScope, exposes, libraryTarget } = options;
    compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
      if (shared && Object.keys(shared).length > 0) {
        new webpack.sharing.SharePlugin({ shared, shareScope }).apply(compiler);
      }

      if (exposes && exposes.length > 0) {
        const exposeShared = {};
        exposes
          .filter(
            exposeKey =>
              fs.existsSync(`${compiler.context}${exposeKey.replace('./', '/')}.js`) ||
              fs.existsSync(`${compiler.context}${exposeKey.replace('./', '/')}.ts`)
          )
          .forEach(exposeKey => {
            const shareKey = exposeKey.split('/').reverse().shift();
            exposeShared[exposeKey] = {
              import: exposeKey,
              singleton: true,
              requiredVersion: false,
              eager: true,
              shareKey: `plitziSdkFederation/${shareKey}`
            };
          });
        new webpack.sharing.SharePlugin({ shared: exposeShared, shareScope }).apply(compiler);
      }

      if (isStorybook) {
        new webpack.sharing.SharePlugin({
          shared: { '@plitzi/plitzi-sdk': { singleton: true, requiredVersion: false, eager: true } },
          shareScope
        }).apply(compiler);
      }
    });

    if (isPlugin && hostName) {
      compiler.hooks.compilation.tap('PlitziPlugin', (compilation, { normalModuleFactory }) => {
        normalModuleFactory.hooks.factorize.tap('ContainerReferencePlugin', data => {
          const { request } = data;
          if (!request.includes('!')) {
            if (
              request.startsWith(hostName) &&
              (request.length === hostName.length || request.charCodeAt(hostName.length) === slashCode)
            ) {
              return new PlitziHostPluginModule(request, [], `.${request.slice(hostName.length)}`, 'default');
            }
          }

          return undefined;
        });

        compilation.hooks.moduleIds.tap('ContainerReferencePlugin', () => {
          const chunkGraph = compilation.chunkGraph;
          const [, /* usedIds */ modules] = getUsedModuleIdsAndModules(compilation);
          modules.forEach(module => {
            const identifier = module.identifier();
            if (identifier && identifier.includes(hostName)) {
              chunkGraph.setModuleId(module, module.libIdent());
            }
          });
        });
      });
    }

    if (isHost || isStorybook) {
      compiler.hooks.thisCompilation.tap('PlitziPlugin', compilation => {
        compilation.hooks.additionalTreeRuntimeRequirements.tap('PlitziPlugin', chunk => {
          if (isHost) {
            compilation.addRuntimeModule(chunk, new PlitziHostPluginRuntime());
          }

          if (isStorybook) {
            compilation.addRuntimeModule(chunk, new PlitziStorybookPluginRuntime());
          }
        });
      });
    }

    if (isPlugin) {
      new PlitziLibraryPlugin({ mode: 'plugin', type: libraryTarget }).apply(compiler);
    }
  }
}

module.exports = PlitziPlugin;
