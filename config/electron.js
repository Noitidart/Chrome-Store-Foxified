const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const utils = require('./utils');

const PROPS = JSON.parse(fs.readFileSync('config/props.json', 'utf8')).electron;

utils.deleteFolderRecursive('./dist/electron');

// try {
//     utils.writeFile('node_modules/cmn/package.json', utils.readFile('node_modules/cmn/package.json').replace('"main": "lib/cmn.js"', '"main": "lib/cmn.min.js"'));
// } catch(ignore) {}

// copy browser-polyfill to src!! not to dist! as otherwise it `import '../common/browser-polyfill'` will fail
// fs.createReadStream('node_modules/webextension-polyfill/dist/browser-polyfill.min.js').pipe(fs.createWriteStream('src/electron/common/browser-polyfill.js'));

module.exports = function (env) {
    return {
        devtool: 'cheap-module-source-map',
        entry: {
            main: './src/electron/main/index.js',
            dashboard: './src/electron/dashboard/index.js'
        },
        output: {
            path: path.join(__dirname, '../dist/electron'),
            filename: '[name]/index.bundle.js'
        },
        resolve: {
            extensions: ['.js']
        },
        module: {
            loaders: [
                { test:/\.js$/, exclude:/node_modules/, loader:'string-replace-loader', query:{ multiple:Object.entries(PROPS.replace).map(([search, replace]) => ({search, replace, flags:'g'})) }, enforce:'pre' },
                { test:/\.js$/, exclude:/node_modules/, loader:'string-replace-loader?search=^.*?console\.[a-zA-Z].*?$&flags=gm&replace=', enforce:'pre' },
                { test:/\.css$/, exclude:/node_modules/, use:['style-loader', 'css-loader'] },
                { test:/\.js$/, exclude:/node_modules/, loader:'babel-loader' },
                { test:/\.(png|jpg|svg|ttf)$/, loader:'file-loader', options:{ publicPath:'../' } }
            ]
        },
        plugins: [
            new CopyWebpackPlugin([
                { from: './src/electron', ignore: ['*.js', '*.css'], transform: (content, path) => /(svg|png|jpeg|jpg|gif)$/i.test(path) ? content : content.toString().replace(new RegExp('(?:' + Object.keys(PROPS.replace).join('|') + ')', 'g'), match => PROPS.replace[match]) },
                // { from: './src/electron/vendor', to: 'vendor/' }
            ])
        ],
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