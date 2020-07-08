import { defineConfig } from 'umi';

const plugins = [require.resolve('./memoryUsage.ts')];

export default defineConfig({
  devtool: process.env.SOURCEMAP ? 'sourcemap' : false,
  plugins: process.env.ESBUILD
    ? [require.resolve('../dist/umiPlugin'), ...plugins]
    : plugins,
  exportStatic: {
    dynamicRoot: true,
  },
});
