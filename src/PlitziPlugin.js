// Packages
const webpack = require('webpack');

// Relatives
const PlitziPluginRuntime = require('./PlitziPluginRuntime');
// const PlitziPluginModule = require('./PlitziPluginModule');
const PlitziPluginHostModule = require('./PlitziPluginHostModule');

const { RuntimeGlobals } = webpack;

const slashCode = '/'.charCodeAt(0);

class PlitziPlugin {
  constructor(options) {
    // validate(options);

    this._options = options;
  }

  /**
   * Apply the plugin
   * @param {Compiler} compiler the compiler instance
   * @returns {void}
   */
  apply(compiler) {
    const { _options: options } = this;
    const { hostName } = options;
    compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
      // if (
      //   options.remotes &&
      //   (Array.isArray(options.remotes) ? options.remotes.length > 0 : Object.keys(options.remotes).length > 0)
      // ) {
      //   const remoteType = options.remoteType || 'script';
      //   new webpack.container.ContainerReferencePlugin({
      //     remoteType,
      //     remotes: options.remotes
      //   }).apply(compiler);
      // }

      if (options.shared) {
        new webpack.sharing.SharePlugin({
          shared: options.shared,
          shareScope: options.shareScope
        }).apply(compiler);
      }
    });

    compiler.hooks.thisCompilation.tap('PlitziPlugin', compilation => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap('PlitziPlugin', (chunk, set) => {
        set.add(RuntimeGlobals.module);
        set.add(RuntimeGlobals.moduleCache);
        set.add(RuntimeGlobals.moduleFactoriesAddOnly);
        set.add(RuntimeGlobals.shareScopeMap);
        set.add(RuntimeGlobals.initializeSharing);
        set.add(RuntimeGlobals.hasOwnProperty);
        compilation.addRuntimeModule(chunk, new PlitziPluginRuntime(set, options.remotes));
      });
    });

    compiler.hooks.compilation.tap('PlitziPlugin', (compilation, { normalModuleFactory }) => {
      normalModuleFactory.hooks.factorize.tap('ContainerReferencePlugin', data => {
        const { request } = data;
        if (!request.includes('!')) {
          const key = hostName || 'plitziSdkFederation';
          if (
            request.startsWith(key) &&
            (request.length === key.length || request.charCodeAt(key.length) === slashCode)
          ) {
            return new PlitziPluginHostModule(request, [], `.${request.slice(key.length)}`, 'default');
          }
        }

        return undefined;
      });
    });

    // testing after this

    // compiler.hooks.compile.tap('PlitziPlugin', ({ normalModuleFactory }) => {
    //   normalModuleFactory.hooks.factorize.tapAsync('PlitziPlugin', (data, callback) => {
    //     const dependency = data.dependencies[0];
    //     callback(null, new PlitziPluginModule('plitziSdkFederation@host', 'script', dependency.request));
    //   });
    // });
  }
}

module.exports = PlitziPlugin;
