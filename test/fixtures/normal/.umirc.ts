import { defineConfig } from 'umi';

export default defineConfig({
  devtool: false,
  plugins: [require.resolve('../../../dist/umiPlugin')],
});
