// Packages
const webpack = require('webpack');

// Relatives
const PlitziPluginRuntime = require('./PlitziPluginRuntime');
const PlitziPluginHostModule = require('./PlitziPluginHostModule');
const PlitziHostPluginRuntime = require('./PlitziHostPluginRuntime');

const { RuntimeGlobals } = webpack;
const slashCode = '/'.charCodeAt(0);

class PlitziPlugin {
  constructor(options) {
    this._options = {
      isPlugin: false,
      shared: {},
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
    const { hostName, isPlugin, shared, shareScope } = options;
    if (shared && Object.keys(shared).length > 0) {
      compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
        new webpack.sharing.SharePlugin({ shared, shareScope }).apply(compiler);
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
              return new PlitziPluginHostModule(request, [], `.${request.slice(hostName.length)}`, 'default');
            }
          }

          return undefined;
        });
      });
    }

    compiler.hooks.thisCompilation.tap('PlitziPlugin', compilation => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap('PlitziPlugin', (chunk, set) => {
        set.add(RuntimeGlobals.module);
        set.add(RuntimeGlobals.moduleCache);
        set.add(RuntimeGlobals.moduleFactoriesAddOnly);
        set.add(RuntimeGlobals.shareScopeMap);
        set.add(RuntimeGlobals.initializeSharing);
        set.add(RuntimeGlobals.hasOwnProperty);
        if (isPlugin) {
          compilation.addRuntimeModule(chunk, new PlitziPluginRuntime(set, options.remotes));
        } else {
          compilation.addRuntimeModule(chunk, new PlitziHostPluginRuntime());
        }
      });
    });
  }
}

module.exports = PlitziPlugin;
