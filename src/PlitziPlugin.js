// Packages
const webpack = require('webpack');
const fs = require('fs');

// Relatives
const PlitziPluginRuntime = require('./PlitziPluginRuntime');
const PlitziHostPluginModule = require('./PlitziHostPluginModule');
const PlitziHostPluginRuntime = require('./PlitziHostPluginRuntime');
const PlitziStorybookPluginRuntime = require('./PlitziStorybookPluginRuntime');
const { getUsedModuleIdsAndModules } = require('./helpers/utils');

const slashCode = '/'.charCodeAt(0);

class PlitziPlugin {
  constructor(options) {
    this._options = {
      isPlugin: false,
      isHost: false,
      isStorybook: false,
      shared: {},
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
    const { hostName, isPlugin, isHost, isStorybook, shared, shareScope, exposes } = options;
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

      if (hostName && isStorybook) {
        new webpack.sharing.SharePlugin({
          shared: { '@plitzi/plitzi-sdk': { singleton: true, requiredVersion: false, eager: true } },
          shareScope
        }).apply(compiler);
      }
    });

    if (hostName) {
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
            // console.log(module.identifier(), module.request);
            const identifier = module.identifier();
            if (identifier && identifier.includes(hostName)) {
              chunkGraph.setModuleId(module, module.libIdent());
            }
          });
        });
      });
    }

    if (isPlugin || isHost || (isStorybook && hostName)) {
      compiler.hooks.thisCompilation.tap('PlitziPlugin', compilation => {
        compilation.hooks.additionalTreeRuntimeRequirements.tap('PlitziPlugin', chunk => {
          if (isPlugin) {
            compilation.addRuntimeModule(chunk, new PlitziPluginRuntime(options.remotes));
          }

          if (isHost) {
            compilation.addRuntimeModule(chunk, new PlitziHostPluginRuntime());
          }

          if (isStorybook && hostName) {
            compilation.addRuntimeModule(chunk, new PlitziStorybookPluginRuntime(hostName));
          }
        });
      });
    }
  }
}

module.exports = PlitziPlugin;
