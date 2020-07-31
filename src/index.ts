// @ts-ignore
import { ModuleFilenameHelpers, Compiler, compilation } from 'webpack';
import { RawSource, SourceMapSource } from 'webpack-sources';
import { startService, Service } from 'esbuild';

export default class ESBuildPlugin {
  options = {};
  static service: Service | null;

  constructor(options: { minify: boolean }) {
    this.options = options;
  }

  static async ensureService(enforce?: boolean) {
    if (!this.service || enforce) {
      this.service = await startService();
    }
  }

  static async stopService() {
    if (ESBuildPlugin.service) {
      try {
        await ESBuildPlugin.service.stop();

        ESBuildPlugin.service = null;
      } catch (e) {
        console.error(e);
      }
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
      await ESBuildPlugin.service!.transform(source, {
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
    const plugin = 'ESBuild Plugin';

    // for webpack3
    if (!compiler.hooks) {
      // sync
      compiler.plugin('compilation', (compilation: Compilation) => {
        compilation.plugin(
          'optimize-chunk-assets',
          this.onOptimizeChunkAssets.bind(this, compiler, compilation),
        );
      });

      // async
      compiler.plugin(
        'before-run',
        async (compiler: Compiler, callback: CallbackFunction) => {
          await ESBuildPlugin.ensureService();
          callback();
        },
      );

      // sync
      compiler.plugin('done', async () => {
        await ESBuildPlugin.stopService();
      });
      process.on('exit', ESBuildPlugin.stopService);

      return;
    } else {
      compiler.hooks.compilation.tap(plugin, (compilation: Compilation) => {
        compilation.hooks.optimizeChunkAssets.tapPromise(plugin, (chunks) =>
          this.onOptimizeChunkAssets(compiler, compilation, chunks),
        );
      });

      compiler.hooks.beforeRun.tapPromise(plugin, async () => {
        await ESBuildPlugin.ensureService();
      });

      compiler.hooks.done.tapPromise(plugin, async () => {
        await ESBuildPlugin.stopService();
      });
    }
  }

  onOptimizeChunkAssets = async (
    compiler: Compiler,
    compilation: Compilation,
    chunks: compilation.Chunk[],
    callback?: CallbackFunction,
  ) => {
    const matchObject = ModuleFilenameHelpers.matchObject.bind(undefined, {});
    const { devtool } = compiler.options;

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

    if (typeof callback === 'function') {
      callback();
    }
  };
}

type Compilation = compilation.Compilation;

interface CallbackFunction {
  (err?: Error, result?: any, ...args: any[]): void;
}
