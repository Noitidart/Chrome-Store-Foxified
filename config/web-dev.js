const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const utils = require('./utils');

utils.deleteFolderRecursive('./dist/web');

try {
    utils.writeFile('node_modules/cmn/package.json', utils.readFile('node_modules/cmn/package.json').replace('"main": "lib/cmn.min.js"', '"main": "lib/cmn.js"'));
} catch(ignore) {}

module.exports = function (env) {
    return {
        devtool: 'eval',
        entry: ['./src/web/index.js'],
        output: {
            path: path.join(__dirname, '../dist/web'),
            filename: 'index.bundle.js'
        },
        resolve: {
            extensions: ['.js']
        },
        // resolveLoader: {
        //     modules: ['node_modules', 'loaders']
        // },
        module: {
            loaders: [
                // { test:/\.css$/, exclude:/node_modules/, loader:'css-var-fallback-loader', enforce:'pre', options:{ default_theme:'../src/web/theme-a.css' } },
                { test:/\.js$/, exclude:/node_modules/, loader:'eslint-loader', enforce:'pre' },
                { test:/\.css$/, exclude:/node_modules/, use:['style-loader', 'css-loader'] },
                { test:/\.js$/, exclude:/node_modules/, loader:'babel-loader' },
                { test:/\.(png|jpg|svg|ttf)$/, loader:'file-loader' }
            ]
        },
        plugins: [
            new CopyWebpackPlugin([
                { from:'./src/web' }
            ], {
                ignore: ['*.js', '*.css', '*.png', '*.jpg', '*.svg', '*.ttf']
            })
        ]
    }
}