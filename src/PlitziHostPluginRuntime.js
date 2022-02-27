// Packages
const webpack = require('webpack');

const { RuntimeModule, Template, RuntimeGlobals } = webpack;

class PlitziHostPluginRuntime extends RuntimeModule {
  constructor() {
    super('plitzi-host-plugin-runtime', RuntimeModule.STAGE_ATTACH);
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    return Template.asString([
      `if (eval('typeof ${RuntimeGlobals.require} !== "undefined"') && eval('${RuntimeGlobals.shareScopeMap}')) ${RuntimeGlobals.shareScopeMap} = eval('${RuntimeGlobals.shareScopeMap}');`
    ]);
  }
}

module.exports = PlitziHostPluginRuntime;
