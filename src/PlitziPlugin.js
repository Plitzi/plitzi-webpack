// Packages
const webpack = require('webpack');

// Relatives
const PlitziLibraryPlugin = require('./PlitziLibraryPlugin');

class PlitziPlugin {
  constructor(options = {}) {
    this._options = {
      isPlugin: false,
      isHost: false,
      isStorybook: false,
      libraryTarget: 'umd',
      shared: {
        react: { singleton: true, requiredVersion: false, eager: !options?.isPlugin ?? true },
        'react-dom': { singleton: true, requiredVersion: false, eager: !options?.isPlugin ?? true }
      },
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
    const { isPlugin, isHost, isStorybook, shared, shareScope, libraryTarget } = options;
    compiler.hooks.afterPlugins.tap('PlitziPlugin', () => {
      if (shared && Object.keys(shared).length > 0) {
        new webpack.sharing.SharePlugin({ shared, shareScope }).apply(compiler);
      }

      if (isStorybook) {
        new webpack.sharing.SharePlugin({
          shared: { '@plitzi/plitzi-sdk': { singleton: true, requiredVersion: false, eager: true } },
          shareScope
        }).apply(compiler);
      }
    });

    if (isPlugin) {
      new PlitziLibraryPlugin({ mode: 'plugin', type: libraryTarget }).apply(compiler);
    } else if (isHost) {
      new PlitziLibraryPlugin({ mode: 'host', type: libraryTarget }).apply(compiler);
    }
  }
}

module.exports = PlitziPlugin;
