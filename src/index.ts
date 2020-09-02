// @ts-ignore
import { ModuleFilenameHelpers, Compiler, compilation } from 'webpack';
import { RawSource, SourceMapSource } from 'webpack-sources';
import {
  startService,
  Service,
  TransformOptions,
  TransformResult,
} from 'esbuild';

export interface ESBuildPluginOptions
  extends Omit<TransformOptions, 'sourcefile'> {}

export default class ESBuildPlugin {
  private readonly options: ESBuildPluginOptions;
  private static service: Service;

  constructor(options: ESBuildPluginOptions = {}) {
    this.options = options;
  }

  static async ensureService(enforce?: boolean) {
    if (!ESBuildPlugin.service || enforce) {
      ESBuildPlugin.service = await startService();
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
    let result: TransformResult | undefined;

    const transform = async () =>
      await ESBuildPlugin.service.transform(source, {
        minify: true,
        sourcemap: !!devtool,
        sourcefile: file,
        ...this.options,
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

  apply(compiler: Compiler): void {
    const matchObject = ModuleFilenameHelpers.matchObject.bind(undefined, {});
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
                if (!matchObject(file)) {
                  continue;
                }
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

                // @ts-ignore
                compilation.updateAsset(file, () => {
                  if (devtool) {
                    return new SourceMapSource(
                      result.js || '',
                      file,
                      result.jsSourceMap as any,
                      source,
                      map,
                      true,
                    );
                  } else {
                    return new RawSource(result.js || '');
                  }
                });
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
