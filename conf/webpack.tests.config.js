import glob from 'glob'
import webpack from 'webpack'
import { createRequire } from 'module'
import CopyPlugin from 'copy-webpack-plugin'

export default (env, argv) => {
  const require = createRequire(import.meta.url)

  return {
    entry: glob.sync('./test/*.js', { ignore: [] }),
    output: {
      filename: '../test/browser/bundle.js'
    },
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    experiments: {
      topLevelAwait: true
    },
    externals: {
      fs: '{}',
      'fs-extra': '{ copy: () => {} }',
      rimraf: '() => {}'
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: 'process/browser.js'
      }),
      new CopyPlugin({
        patterns: [
          { from: 'test/fixtures/newtestkeys2/', to: 'test/fixtures/newtestkeys2/' }
        ]
      })
    ],
    resolve: {
      modules: [
        'node_modules'
      ],
      fallback: {
        path: require.resolve('path-browserify')
      }
    }
  }
}
