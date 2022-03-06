// Packages
const webpack = require('webpack');

const { RuntimeModule, Template, RuntimeGlobals } = webpack;

class PlitziStorybookPluginRuntime extends RuntimeModule {
  constructor(hostName) {
    super('plitzi-storybook-plugin-runtime', RuntimeModule.STAGE_ATTACH);
    this._hostName = hostName;
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { compilation } = this;
    const { runtimeTemplate } = compilation;

    return Template.asString([
      `if (${RuntimeGlobals.moduleFactories}) {
        const moduleKey = 'webpack/container/remote/${this._hostName}/usePlitziServiceContext';
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
