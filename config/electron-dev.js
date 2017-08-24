const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const utils = require('./utils');

const PROPS = JSON.parse(fs.readFileSync('config/props.json', 'utf8')).electron;

utils.deleteFolderRecursive('./dist/electron');

// try {
//     utils.writeFile('node_modules/cmn/package.json', utils.readFile('node_modules/cmn/package.json').replace('"main": "lib/cmn.min.js"', '"main": "lib/cmn.js"'));
// } catch(ignore) {}

// PROPS.replace['~ADDON_SHUTDOWN_WAR~'] = 'shutdown-war-' + Date.now() + '.txt';
// utils.writeFile('./dist/electron/' + PROPS.replace['~ADDON_SHUTDOWN_WAR~'], '');

// copy browser-polyfill to src!! not to dist! as otherwise it `import '../common/browser-polyfill'` will fail
// fs.createReadStream('node_modules/webextension-polyfill/dist/browser-polyfill.js').pipe(fs.createWriteStream('src/electron/vendor/browser-polyfill.js');

module.exports = function (env) {
    return {
        devtool: 'cheap-module-source-map',
        entry: {
            background: './src/electron/background/index.js',
            dashboard: './src/electron/dashboard/index.js'
        },
        output: {
            path: path.join(__dirname, '../dist/electron'),
            filename: '[name].bundle.js'
        },
        node: {
            __dirname: false,
            __filename: false
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
                { test:/\.(png|jpg|svg|ttf|html)$/, loader:'file-loader' }
            ]
        },
        plugins: [
            new webpack.IgnorePlugin(new RegExp("^(ipc)$"))
        ],
        target: 'electron',
        externals: [
            (function () {
                var IGNORES = [ 'electron' ];
                return function (context, request, callback) {
                    if (IGNORES.indexOf(request) >= 0) {
                        return callback(null, "require('" + request + "')");
                    }
                    return callback();
                };
            })()
        ]
    }
}