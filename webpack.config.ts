const path = require('path');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    popup: './src/popup/index.tsx',
    content: './src/content/content.ts',
    background: './src/background/background.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                noEmit: false,
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'icons/[name][ext]'
        }
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './public/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
      cache: false
    }),
    new Dotenv({
      path: `.env.${process.env.NODE_ENV}`,
      safe: true,
    }),
    new CopyPlugin({
      patterns: [
        { 
          from: 'public/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'public/icons',
          to: 'icons'
        }
      ],
    }),
  ],
  devtool: process.env.NODE_ENV === 'development' ? 'cheap-module-source-map' : false,
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    hot: false,
    port: 8081,
    devMiddleware: {
      writeToDisk: true,
    },
    allowedHosts: 'all',
    client: {
      webSocketURL: {
        hostname: 'localhost',
      },
    },
  },
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    splitChunks: {
      chunks(chunk) {
        return chunk.name !== 'background';
      },
    },
  },
};