const webpack = require('webpack');
const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');

const dev = process.env.NODE_ENV !== 'production';

module.exports = {
  target: 'node',
  mode: dev ? 'development' : 'production',
  watch: dev,
  entry: [dev && 'webpack/hot/poll?1000', './src/main.ts'].filter(Boolean),
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'server.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript'],
          plugins: [
            '@babel/plugin-syntax-top-level-await',
            'babel-plugin-transform-typescript-metadata',
            ['@babel/plugin-proposal-decorators', { legacy: true }],
          ],
        },
      },
    ],
  },
  plugins: [
    new ESLintPlugin(),
    dev && new webpack.HotModuleReplacementPlugin(),
    dev && new RunScriptWebpackPlugin({ name: 'server.js' }),
  ].filter(Boolean),
  externals: [
    nodeExternals({
      allowlist: [dev && 'webpack/hot/poll?1000'].filter(Boolean),
    }),
  ],
  optimization: {
    minimize: false,
  },
  experiments: {
    topLevelAwait: true,
  },
};
