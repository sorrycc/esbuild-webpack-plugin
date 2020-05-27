const plugins = [require.resolve('./memoryUsage.ts')];

export default {
  devtool: process.env.SOURCEMAP ? 'sourcemap' : false,
  plugins: process.env.ESBUILD
    ? [require.resolve('../dist/umiPlugin'), ...plugins]
    : plugins,
};
