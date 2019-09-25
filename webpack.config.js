const path = require('path');
const PrettierPlugin = require("prettier-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    bundle: './src/index.js',
    bundle_testPage: './src/index_testPage.js',
    bundle_generator: './src/index_generator.js',
    // transformData: './transformData.js'
  },
  devServer: {
    contentBase: './dist',
    hot: true
  },
  devtool: "eval-source-map",
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  // optimization: {
  //   splitChunks: {
  //     chunks: 'all'
  //   }
  // },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['*', '.js', '.vue', '.json', '.csv']
  },
  module: {
    rules: [
      // {
      //   test: /\.json$/,
      //   loader: 'json-loader'
      // },
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
      {
        test: /\.(data)$/,
        loader: 'csv-loader',
        options: {
          dynamicTyping: true,
          skipEmptyLines: true
        }
      },
    ]
  },
  plugins: [
    new PrettierPlugin({
      singleQuote: true
    }),
    new CopyWebpackPlugin([
      './*.html',
      { from: 'data', to: 'data' },
    ])
  ],
  externals: [
    // { d3: 'd3' },
    /^(..\/data\/)/,
  ]
};