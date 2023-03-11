'use strict';

const webpack = require('webpack');
const { propertyAccess } = require('./helpers/utils');

const {
  Template,
  sources: { ConcatSource },
  library: { AbstractLibraryPlugin, EnableLibraryPlugin }
} = webpack;

class PlitziLibraryPlugin extends AbstractLibraryPlugin {
  constructor() {
    super({ pluginName: 'PlitziLibraryPlugin', type: 'plitzi' });
  }

  parseOptions(library) {
    let name;
    let names;
    if (typeof library.name === 'object' && !Array.isArray(library.name)) {
      name = library.name.root || library.name.amd || library.name.commonjs;
      names = library.name;
    } else {
      name = library.name;
      const singleName = Array.isArray(name) ? name[0] : name;
      names = { commonjs: singleName, root: library.name, amd: singleName };
    }

    return {
      name,
      names,
      auxiliaryComment: library.auxiliaryComment,
      namedDefine: library.umdNamedDefine
    };
  }

  apply(compiler) {
    EnableLibraryPlugin.setEnabled(compiler, 'plitzi');

    super.apply(compiler);
  }

  render(source) {
    const result = new ConcatSource(
      `export default (function plitziPluginLoaderDefinition() {\nreturn (init, shared) =>\nnew Promise((resolve, reject) => {\n`,
      source,
      '\n});\n})()'
    );

    return result;
  }

  renderStartup(source, module, { moduleGraph, chunk }) {
    const result = new ConcatSource(source);
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const exports = [];
    const isAsync = moduleGraph.isAsync(module);
    if (isAsync) {
      result.add(`__webpack_exports__ = await __webpack_exports__;\n`);
    }

    for (const exportInfo of exportsInfo.orderedExports) {
      if (!exportInfo.provided) {
        continue;
      }

      const varName = `__webpack_exports__${Template.toIdentifier(exportInfo.name)}`;
      result.add(
        `var ${varName} = __webpack_exports__${propertyAccess([
          exportInfo.getUsedName(exportInfo.name, chunk.runtime)
        ])};\n`
      );
      exports.push(`${exportInfo.name}: ${varName}`);
    }

    if (exports.length > 0) {
      result.add(`resolve({ ${exports.join(', ')} });\n`);
    }

    return result;
  }
}

module.exports = PlitziLibraryPlugin;
