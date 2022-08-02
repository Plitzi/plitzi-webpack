const getUsedModuleIdsAndModules = (compilation, filter) => {
  const chunkGraph = compilation.chunkGraph;

  const modules = [];

  /** @type {Set<string>} */
  const usedIds = new Set();
  if (compilation.usedModuleIds) {
    for (const id of compilation.usedModuleIds) {
      usedIds.add(id + '');
    }
  }

  for (const module of compilation.modules) {
    if (!module.needId) continue;
    const moduleId = chunkGraph.getModuleId(module);
    if (moduleId !== null) {
      usedIds.add(moduleId + '');
    } else {
      if ((!filter || filter(module)) && chunkGraph.getNumberOfModuleChunks(module) !== 0) {
        modules.push(module);
      }
    }
  }

  return [usedIds, modules];
};

module.exports = { getUsedModuleIdsAndModules };
