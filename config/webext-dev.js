const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const utils = require('./utils');

const PROPS = JSON.parse(fs.readFileSync('config/props.json', 'utf8')).webext;

utils.deleteFolderRecursive('./dist/webext');

module.exports = function (env) {
    return {
        devtool: 'cheap-module-source-map',
        entry: {
            background: './src/webext/background/index.js',
            dashboard: './src/webext/dashboard/index.js',
            cws: './src/webext/content_scripts/cws/index.js'
        },
        output: {
            path: path.join(__dirname, '../dist/webext'),
            filename: '[name].bundle.js'
        },
        resolve: {
            extensions: ['.js']
        },
        module: {
            loaders: [
                { test:/\.js$/, exclude:/node_modules/, loader:'string-replace-loader', query:{ multiple:Object.entries(PROPS.replace).map(([search, replace]) => ({search, replace, flags:'g'})) }, enforce:'pre' },
                { test:/\.js$/, exclude:/node_modules/, loader:'eslint-loader', enforce:'pre' },
                { test:/\.css$/, exclude:/node_modules/, use:['style-loader', 'css-loader'] },
                { test:/\.js$/, exclude:/node_modules/, loader:'babel-loader' },
                { test:/\.(png|jpg|svg|ttf|html)$/, loader:'file-loader' },
                {
                    test: /\.(scss)$/,
                    use: [
                        { loader:'style-loader' }, // inject CSS to page
                        { loader:'css-loader' }, // translates CSS into CommonJS modules
                        {
                            loader: 'postcss-loader', // Run post css actions
                            options: {
                                plugins: function() { // post css plugins, can be exported to postcss.config.js
                                    return [
                                        require('precss'),
                                        require('autoprefixer')
                                    ];
                                }
                            }
                        },
                        { loader:'sass-loader' } // compiles SASS to CSS
                    ]
                }
            ]
        },
        plugins: [
            new CopyWebpackPlugin([
                { from:'**/*.json', context:'./src/webext/', transform: content => content.toString().replace(new RegExp('(?:' + Object.keys(PROPS.replace).join('|') + ')', 'g'), match => PROPS.replace[match]) },
                { from:'./icon*.png', context:'./src/webext/' }
            ])
        ]
    }
}
