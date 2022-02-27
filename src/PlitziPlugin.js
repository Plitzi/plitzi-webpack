// Packages
const webpack = require('webpack');
const fs = require('fs');

// Relatives
const PlitziPluginRuntime = require('./PlitziPluginRuntime');
const PlitzihostPluginModule = require('./PlitzihostPluginModule');
const PlitziHostPluginRuntime = require('./PlitziHostPluginRuntime');

const slashCode = '/'.charCodeAt(0);

class PlitziPlugin {
  constructor(options) {
    this._options = {
      isPlugin: false,
      isHost: false,
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
    const { hostName, isPlugin, isHost, shared, shareScope, exposes } = options;
    if (shared && Object.keys(shared).length > 0) {
      compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
        new webpack.sharing.SharePlugin({ shared, shareScope }).apply(compiler);
      });
    }

    if (exposes && exposes.length > 0) {
      compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
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
      });
    }

    if (hostName) {
      compiler.hooks.compilation.tap('PlitziPlugin', (compilation, { normalModuleFactory }) => {
        normalModuleFactory.hooks.factorize.tap('ContainerReferencePlugin', data => {
          const { request } = data;
          if (!request.includes('!')) {
            if (
              request.startsWith(hostName) &&
              (request.length === hostName.length || request.charCodeAt(hostName.length) === slashCode)
            ) {
              return new PlitzihostPluginModule(request, [], `.${request.slice(hostName.length)}`, 'default');
            }
          }

          return undefined;
        });
      });
    }

    compiler.hooks.thisCompilation.tap('PlitziPlugin', compilation => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap('PlitziPlugin', chunk => {
        if (isPlugin) {
          compilation.addRuntimeModule(chunk, new PlitziPluginRuntime(options.remotes));
        }

        if (isHost) {
          compilation.addRuntimeModule(chunk, new PlitziHostPluginRuntime());
        }
      });
    });
  }
}

module.exports = PlitziPlugin;
