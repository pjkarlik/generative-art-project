/* eslint no-console: 0 */

"use strict";
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const DEV_PORT = 2020;

const config = {
  name: "generative art project",
  target: "web",
  mode: 'development',
  entry: {
    main: "./src/index.js",
    vendor: ["@babel/polyfill"],
  },
  output:
    {
      path: path.join(__dirname, "./dist/"),
      filename: "[name].js",
      chunkFilename: "[id].js",
      libraryTarget: "umd",
    },
  watch: true,
  watchOptions: {
    ignored: '/node_modules/',
  },
  devtool: 'source-map',
  devServer:
  {
    host: '0.0.0.0',
    port: DEV_PORT,
    static : {
      directory : path.join(__dirname, "dist/")
    },
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        include: [/src/, /resources/],
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|gif|cur|jpg)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "images/[name]__[hash:base64:5].[ext]",
            },
          },
          {
            loader: "image-webpack-loader",
            options: {
              bypassOnDebug: true,
              optipng: {
                optimizationLevel: 7,
              },
              gifsicle: {
                interlaced: false,
              },
            },
          },
        ],
      },
    ],
  },
  plugins:
  [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      css: "style/style.css",
      title: "Generative Art Project",
      favicon: "./resources/images/favicon.ico",
      template: "./resources/templates/template.ejs",
      inject: "body",
    }),
  ],
};

module.exports = config;
