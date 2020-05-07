const plugins = [require.resolve('./memoryUsage.ts')];

export default {
  plugins: process.env.ESBUILD
    ? [require.resolve('../dist/umiPlugin'), ...plugins]
    : plugins,
};
