function buildConfig(env) {
    return require('./config/' + env + '.js')({ env })
}

module.exports = buildConfig;
