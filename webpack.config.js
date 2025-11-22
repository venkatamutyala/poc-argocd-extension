const path = require('path');

module.exports = {
  entry: './extension.js',
  output: {
    filename: 'extension.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'window',
    libraryExport: 'default'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  externals: {
    react: 'React'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
