// Packages
const webpack = require('webpack');

const { Module } = webpack;

class PlitziHostPluginModule extends Module {
  constructor(request, externalRequests, internalRequest, shareScope) {
    super('plitzi-host-plugin-module', null);

    this.request = request;
    this.externalRequests = externalRequests;
    this.internalRequest = internalRequest;
    this.shareScope = shareScope;
    this.externalType = 'module';
    this._identifier = `remote (${shareScope}) ${this.externalRequests.join(' ')} ${this.internalRequest}`;
  }

  /**
   * @returns {string} a unique identifier of the module
   */
  identifier() {
    return `external ${this.externalType} ${JSON.stringify(this.request)}`;
  }

  /**
   * @param {string=} type the source type for which the size should be estimated
   * @returns {number} the estimated size of the module (must be non-zero)
   */
  size(/* type */) {
    return 42;
  }

  /**
   * @param {LibIdentOptions} options options
   * @returns {string | null} an identifier for library inclusion
   */
  libIdent(/* options */) {
    return `${this.layer ? `(${this.layer})/` : ''}webpack/container/remote/${this.request}`;
  }

  /**
   * @param {RequestShortener} requestShortener the request shortener
   * @returns {string} a user readable identifier of the module
   */
  readableIdentifier(/* requestShortener */) {
    return `external ${JSON.stringify(this.request)}`;
  }

  build(options, compilation, resolver, fs, callback) {
    this.buildMeta = {};
    this.buildInfo = {
      strict: true
    };

    callback();
  }
}

module.exports = PlitziHostPluginModule;
