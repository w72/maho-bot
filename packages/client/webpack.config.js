const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const dev = process.env.NODE_ENV !== 'production';

module.exports = {
  target: 'web',
  mode: dev ? 'development' : 'production',
  devtool: dev ? 'eval-source-map' : undefined,
  entry: './src/main.ts',
  resolve: {
    extensions: ['.tsx', '.ts', '.css'],
    plugins: [new TsconfigPathsPlugin()],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react', '@babel/preset-typescript'],
          plugins: [dev && 'react-refresh/babel'].filter(Boolean),
        },
      },
      {
        test: /\.css$/,
        use: [
          dev ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: dev ? '[local]-[hash:6]' : '[hash:8]',
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: 'src/index.html' }),
    new ESLintPlugin(),
    dev && new ReactRefreshWebpackPlugin(),
    !dev && new MiniCssExtractPlugin(),
    !dev && new CleanWebpackPlugin(),
  ].filter(Boolean),
  stats: {
    modules: false,
  },
  experiments: {
    topLevelAwait: true,
  },
  devServer: {
    host: '0.0.0.0',
    port: 3300,
    hot: true,
    public: 'localhost:3300',
    publicPath: '/',
    historyApiFallback: true,
  },
};
