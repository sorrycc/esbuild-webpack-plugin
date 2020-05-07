export default {
  plugins: process.env.ESBUILD ? [require.resolve('../dist/umiPlugin')] : [],
};
