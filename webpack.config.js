const path = require('path');
const fs = require('fs');
const forever = require('forever-monitor');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = () => {
    /** 当前是否是开发环境 */
    const isEnvDevelopment = process.env.WEBPACK_BUILD_ENV === 'dev';
    /** 打包结果路径 */
    const dist = path.resolve(__dirname, 'dist');

    const config = {
        mode: 'development',
        devtool: isEnvDevelopment ? 'cheap-module-source-map' : 'source-map',
        target: 'async-node',
        watch: isEnvDevelopment ? true : false,
        output: {
            filename: '[name].js',
            path: dist
        },
        plugins: [],
        entry: {
            run: [path.resolve(__dirname, 'src/run.ts')]
        },
        module: {
            rules: [
                {
                    test: /\.(js|mjs|cjs|ts)$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: ['@babel/preset-typescript'],
                            compact: 'auto'
                        }
                    }
                }
            ]
        },
        optimization: {
            splitChunks: false,
            removeAvailableModules: false,
            removeEmptyChunks: false,
            mergeDuplicateChunks: false,
            occurrenceOrder: false,
            concatenateModules: false
        },
        resolve: {
            modules: ['__modules', 'node_modules'],
            extensions: ['.js', '.ts', '.mjs', '.cjs']
        },
        stats: {
            all: false,
            modules: true,
            maxModules: 0,
            errors: true,
            warnings: true,
            moduleTrace: true,
            errorDetails: true,
            performance: true
        },
        performance: {
            maxEntrypointSize: 100 * 1024 * 1024,
            maxAssetSize: 100 * 1024 * 1024
        }
    };

    if (!isEnvDevelopment) {
        config.plugins.push(new CleanWebpackPlugin());
        if (fs.existsSync(dist)) fs.rmdirSync(dist);
    } else {
        let child;

        const exitHandler = async (...args) => {
            child.stop();
        };
        process.on('exit', exitHandler);
        process.on('SIGINT', exitHandler);
        process.on('SIGUSR1', exitHandler);
        process.on('SIGUSR2', exitHandler);
        process.on('uncaughtException', exitHandler);

        config.plugins.push({
            apply: compiler => {
                compiler.hooks.watchRun.tap('ApiServerPlugin', compilation => {
                    if (child) {
                        child.stop();
                    } else {
                        child = new forever.Monitor(
                            path.resolve(dist, 'run.js'),
                            {
                                max: 1,
                                silent: false,
                                killTree: true
                            }
                        );
                    }
                });
                compiler.hooks.afterEmit.tap('ApiServerPlugin', compilation => {
                    child.start();
                });
            }
        });
    }

    return config;
};
