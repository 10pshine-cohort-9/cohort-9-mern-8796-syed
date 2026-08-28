const tsJest = require('ts-jest').default;

const transformer = tsJest.createTransformer({
  tsconfig: {
    jsx: 'react-jsx',
    module: 'commonjs',
    moduleResolution: 'node',
    target: 'es2020',
    lib: ['es2020', 'dom', 'dom.iterable'],
    skipLibCheck: true,
    esModuleInterop: true,
    types: ['vite/client', 'jest', 'node'],
  },
  diagnostics: {
    ignoreCodes: [1343],
  },
});

module.exports = {
  process(src, filename, config) {
    const modifiedSrc = src.replace(/import\.meta\.env/g, 'process.env');
    return transformer.process(modifiedSrc, filename, config);
  },
};
