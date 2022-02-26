// Packages
const webpack = require('webpack');

const { RuntimeModule, Template, RuntimeGlobals } = webpack;

class PlitziPluginRuntime extends RuntimeModule {
  constructor(runtimeRequirements, remotes) {
    super('plitzi-plugin-runtime', RuntimeModule.STAGE_ATTACH);
    this._runtimeRequirements = runtimeRequirements;
    this._remotes = remotes;
  }

  /**
   * @returns {string} runtime code
   */
  generate() {
    const { compilation } = this;
    const { runtimeTemplate } = compilation;

    return Template.asString([
      `if (!${RuntimeGlobals.hasOwnProperty}(this, 'document') || !this.document.currentScript) return;
        var { init, shared } = this.document.currentScript;
        if (init) {
          var modules = init();
          Object.keys(modules).forEach(${runtimeTemplate.basicFunction('moduleKey', [
            `${RuntimeGlobals.moduleFactories}[moduleKey] = modules[moduleKey];`
          ])});
        }

        if (shared) {
          var sharedModules = shared();
          Object.keys(sharedModules).forEach(${runtimeTemplate.basicFunction('scopeKey', [
            `var scopeSection = ${RuntimeGlobals.shareScopeMap}[scopeKey] || {};
              if (!${RuntimeGlobals.shareScopeMap}[scopeKey]) ${RuntimeGlobals.shareScopeMap}[scopeKey] = scopeSection;
              Object.keys(sharedModules[scopeKey]).forEach(${runtimeTemplate.basicFunction('moduleKey', [
                `${RuntimeGlobals.shareScopeMap}[scopeKey][moduleKey] = sharedModules[scopeKey][moduleKey];`
              ])})`
          ])});
        }`
    ]);
  }
}

module.exports = PlitziPluginRuntime;
