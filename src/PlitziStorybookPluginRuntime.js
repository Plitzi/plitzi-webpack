// Packages
const webpack = require('webpack');

const { RuntimeModule, Template, RuntimeGlobals } = webpack;

class PlitziStorybookPluginRuntime extends RuntimeModule {
  constructor() {
    super('plitzi-storybook-plugin-runtime', RuntimeModule.STAGE_ATTACH);
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    return Template.asString([
      `if (${RuntimeGlobals.moduleFactories}) {
        ${RuntimeGlobals.moduleFactories}['webpack/container/remote/plitziSdkFederation/usePlitziServiceContext'] = module => {
          const moduleAux = { exports: {} }
          ${RuntimeGlobals.moduleFactories}['webpack/sharing/consume/default/@plitzi/plitzi-sdk/@plitzi/plitzi-sdk'](moduleAux);
          const hostModule = module.id.replace('webpack/container/remote/plitziSdkFederation/', '');
          if (!moduleAux.exports[hostModule]) return;
          module.exports = moduleAux.exports[hostModule];
        }
      }`
    ]);
  }
}

module.exports = PlitziStorybookPluginRuntime;
