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
    const { compilation } = this;
    const { runtimeTemplate } = compilation;

    return Template.asString([
      `if (${RuntimeGlobals.moduleFactories}) {
        const moduleKey = 'webpack/container/remote/plitziSdkFederation/usePlitziServiceContext';
        ${RuntimeGlobals.moduleFactories}[moduleKey] = ${runtimeTemplate.basicFunction('module', [
        `const moduleAux = { exports: {} }
        ${RuntimeGlobals.moduleFactories}['webpack/sharing/consume/default/@plitzi/plitzi-sdk/@plitzi/plitzi-sdk'](moduleAux);
        const hostModule = module.id.replace('webpack/container/remote/plitziSdkFederation/', '');
        if (!moduleAux.exports[hostModule]) return;
        module.exports = moduleAux.exports[hostModule];`
      ])}
      }`
    ]);
  }
}

module.exports = PlitziStorybookPluginRuntime;
