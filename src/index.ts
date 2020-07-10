import { Compiler, compilation } from 'webpack';
import { RawSource, SourceMapSource } from 'webpack-sources';
import { startService, Service } from 'esbuild';

export default class ESBuildPlugin {
  options = {};
  static service: Service;

  constructor(options: { minify: boolean }) {
    this.options = options;
  }

  static async ensureService(enforce?: boolean) {
    if (!this.service || enforce) {
      this.service = await startService();
    }
  }

  async transformCode({
    source,
    file,
    devtool,
  }: {
    source: string;
    file: string;
    devtool: string | boolean | undefined;
  }) {
    let result: any;

    const transform = async () =>
      await ESBuildPlugin.service.transform(source, {
        ...this.options,
        minify: true,
        sourcemap: !!devtool,
        sourcefile: file,
      });

    try {
      result = await transform();
    } catch (e) {
      // esbuild service might be destroyed when using parallel-webpack
      if (e.message === 'The service is no longer running') {
        await ESBuildPlugin.ensureService(true);
        result = await transform();
      } else {
        throw e;
      }
    }

    return result;
  }

  apply(compiler: Compiler) {
    const { devtool } = compiler.options;

    const plugin = 'ESBuild Plugin';
    compiler.hooks.compilation.tap(
      plugin,
      (compilation: compilation.Compilation) => {
        compilation.hooks.optimizeChunkAssets.tapPromise(
          plugin,
          async (chunks: compilation.Chunk[]) => {
            for (const chunk of chunks) {
              for (const file of chunk.files) {
                if (!/\.m?js(\?.*)?$/i.test(file)) {
                  continue;
                }

                const assetSource = compilation.assets[file];
                const { source, map } = assetSource.sourceAndMap();
                const result = await this.transformCode({
                  source,
                  file,
                  devtool,
                });

                compilation.assets[file] = devtool
                  ? new SourceMapSource(
                      result.js || '',
                      file,
                      result.jsSourceMap,
                      source,
                      map,
                      true,
                    )
                  : new RawSource(result.js || '');
              }
            }
          },
        );
      },
    );

    compiler.hooks.beforeRun.tapPromise(plugin, async () => {
      await ESBuildPlugin.ensureService();
    });

    compiler.hooks.done.tapPromise(plugin, async () => {
      if (ESBuildPlugin.service) {
        await ESBuildPlugin.service.stop();
      }
    });
  }
}
