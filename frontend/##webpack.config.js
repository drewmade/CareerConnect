const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer'); // PostCSS plugin for vendor prefixes

module.exports = {
  // Set the mode to development or production
  mode: 'development', // Can be 'production' for build command
  // Entry point of our application
  entry: './src/index.js',
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'build'), // Output directory
    filename: 'bundle.js', // Name of the bundled JavaScript file
    publicPath: '/', // Public URL of the output directory when referenced in a browser
  },
  // Module rules for handling different file types
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // Apply to .js and .jsx files
        exclude: /node_modules/, // Don't process files in node_modules
        use: {
          loader: 'babel-loader', // Use babel-loader for transpilation
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // Babel presets for ES6+ and React
          },
        },
      },
      {
        test: /\.css$/, // Apply to .css files
        use: [
          'style-loader', // Injects CSS into the DOM
          'css-loader',   // Interprets @import and url() like import/require()
          {
            loader: 'postcss-loader', // Processes CSS with PostCSS (for Tailwind and Autoprefixer)
            options: {
              postcssOptions: {
                plugins: [
                  tailwindcss('./tailwind.config.js'), // Apply Tailwind CSS
                  autoprefixer, // Add vendor prefixes
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/, // For image files
        type: 'asset/resource', // Webpack 5 asset module type
        generator: {
          filename: 'assets/images/[name][ext]', // Output path for images
        },
      },
    ],
  },
  // Resolve extensions to allow importing without specifying them
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  // Plugins for Webpack
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your HTML template
      filename: 'index.html', // Output HTML file name
      favicon: './public/favicon.ico', // Path to your favicon
    }),
  ],
  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'), // Serve static files from public directory
    },
    compress: true, // Enable gzip compression
    port: 3000, // Port for the dev server
    historyApiFallback: true, // Fallback to index.html for React Router (if used later)
  },
};
