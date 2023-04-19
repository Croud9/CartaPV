const path = require('path');
// const ExtractTextPlugin = require('extract-text-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");


module.exports = {
    target: 'web',
    mode: 'development',
    entry: './src/app.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    watchOptions: {
        poll: true,
        ignored: /node_modules/
    },
    devServer: {
        hot: true,
        compress: true,
        port: 9000,
        static: {                               
            directory: path.join(__dirname, 'dist'), 
        },
    },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
                loader: 'css-loader',
                options: {
                    importLoaders: 2,
                    sourceMap: true
                }
            },
            {
                loader: 'sass-loader',
                options: {
                    sourceMap: true
                }
            }
        ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({filename: 'style.css'})
    ]
  };