import { IApi } from 'umi';

export default (api: IApi) => {
  api.modifyBundleConfig((memo) => {
    if (memo.optimization) {
      memo.optimization.minimizer = [new (require('./index').default)()];
    }
    return memo;
  });
};
