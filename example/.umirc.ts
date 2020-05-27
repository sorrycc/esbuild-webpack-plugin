const plugins = [require.resolve('./memoryUsage.ts')];

export default {
  devtool: 'sourcemap',
  plugins: process.env.ESBUILD
    ? [require.resolve('../dist/umiPlugin'), ...plugins]
    : plugins,
};
