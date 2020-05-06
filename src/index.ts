// @ts-ignore
import { ModuleFilenameHelpers, Compiler, compilation } from 'webpack';
import { RawSource } from 'webpack-sources';
import { startService, Service } from 'esbuild';

let _service: Service;
const ensureService = async () => {
  if (!_service) {
    _service = await startService();
  }
  return _service;
};

export default class ESBuildPlugin {
  constructor(options = {}) {}

  apply(compiler: Compiler) {
    const matchObject = ModuleFilenameHelpers.matchObject.bind(undefined, {});

    const plugin = 'ESBuild Plugin';
    compiler.hooks.compilation.tap(
      plugin,
      (compilation: compilation.Compilation) => {
        compilation.hooks.optimizeChunkAssets.tapPromise(
          plugin,
          async (chunks: compilation.Chunk[]) => {
            const service = await ensureService();
            for (const chunk of chunks) {
              for (const file of chunk.files) {
                if (!matchObject(file)) {
                  continue;
                }
                if (!/\.m?js(\?.*)?$/i.test(file)) {
                  continue;
                }

                let code = compilation.assets[file].source();
                try {
                  code = await service.transform(code, {
                    minify: true,
                  });
                } catch (e) {}
                // @ts-ignore
                compilation.updateAsset(file, (old: string) => {
                  return new RawSource(code.js || code.css || '');
                });
              }
            }
          },
        );
      },
    );

    compiler.hooks.afterEmit.tapPromise(plugin, async () => {
      if (_service) {
        await _service.stop();
      }
    });
  }
}
