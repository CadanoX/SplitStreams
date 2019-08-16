const path = require('path');
const PrettierPlugin = require("prettier-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: {
    bundle: './src/index.js',
    bundle_testPage: './src/index_testPage.js',
    bundle_generator: './src/index_generator.js'
  },
  devServer: {
    contentBase: './dist',
    hot: true
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['*', '.js', '.vue', '.json']
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.ttl$/i,
        use: 'raw-loader',
      },
      {
        test: /\.(csv|tsv)$/,
        loader: 'csv-loader',
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      },
    ]
  },
  plugins: [
    new PrettierPlugin({
      singleQuote: true
    })
  ]
};