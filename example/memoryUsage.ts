export default (api) => {
  api.onBuildComplete(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(
      `The script uses approximately ${Math.round(used * 100) / 100} MB`,
    );
  });
};
