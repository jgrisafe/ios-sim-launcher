var path = require('path');
var webpack = require('webpack');

module.exports = {
  target: 'node',
  node: {
    fs: "empty",
  },
  entry: './src/index.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'app.bundle.js'
  },
  plugins: [
    new webpack.BannerPlugin({
      test: /\.js$/,
      banner: '#!/usr/bin/env node',
      raw: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['es2015']
          }
        }
      },
    ]
  }
};