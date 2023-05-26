// const TerserPlugin = require("terser-webpack-plugin");
const { defineConfig } = require("@vue/cli-service");
const CopyPlugin = require("copy-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const webpack = require("webpack");

module.exports = defineConfig({
    devServer: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
        },
    },
    // publicPath: "./",
    transpileDependencies: true,
    productionSourceMap: true,
    parallel: 4,
    configureWebpack: (config) => {
        if (process.env.NODE_ENV === "development") {
            config.devtool = "eval-source-map";
            config.output.devtoolModuleFilenameTemplate = (info) =>
                info.resourcePath.match(/\.vue$/) &&
                !info.identifier.match(/type=script/) // this is change ✨
                    ? `webpack-generated:///${info.resourcePath}?${info.hash}`
                    : `webpack-yourCode:///${info.resourcePath}`;

            config.output.devtoolFallbackModuleFilenameTemplate =
                "webpack:///[resource-path]?[hash]";
        }

        config.resolve.fallback = {
            fs: false,
            tls: false,
            net: false,
            path: require.resolve("path-browserify"),
            zlib: false,
            http: false,
            https: false,
            stream: false,
            crypto: false,
            os: require.resolve('os-browserify/browser'),
            perf_hooks: false
        };
        config.resolve.symlinks = false;
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    // Rather than copy files in node_modules to public, just
                    // copy here. This is so if you update via npm, you'll still
                    // get the latest versions.
                    {
                        from: "src/Testing/mols/4WP4.pdb",
                        to: "4WP4.pdb",
                    },
                    {
                        from: "node_modules/@rdkit/rdkit/dist",
                        to: "js/rdkitjs",
                    },

                    // Below is for webworker
                    {
                        from: "node_modules/@rdkit/rdkit/dist/RDKit_minimal.wasm",
                        to: "js/RDKit_minimal.wasm",
                    },
                ],
            })
        );
        config.plugins.push(
            new CircularDependencyPlugin({
                // exclude detection of files based on a RegExp
                exclude: /a\.js|node_modules/,
                // include specific files based on a RegExp
                // include: /src/,
                // add errors to webpack instead of warnings
                failOnError: true,
                // allow import cycles that include an asyncronous import,
                // e.g. via import(/* webpackMode: "weak" */ './file.js')
                allowAsyncCycles: false,
                // set the current working directory for displaying module paths
                cwd: process.cwd(),
            })
        );

        if (process.env.NODE_ENV === "docs") {
            config.optimization.minimize = false;
        }

        config.optimization.splitChunks = {
            minSize: 10000,
            maxSize: 250000,
        };

        config.optimization.runtimeChunk = true;

        // Only build source maps if in development
        config.devtool =
            process.env.NODE_ENV === "development" ? "eval-source-map" : false;

        // config.optimization.minimizer = [
        //     new TerserPlugin({
        //         terserOptions: {
        //             format: {
        //                 comments: true,
        //                 // beautify: true,
        //             },
        //         },
        //         extractComments: false,
        //     }),
        // ];
    },
    pluginOptions: {
        webpackBundleAnalyzer: {
            openAnalyzer: true,
        },
    },

    // {
    //     // devtool: 'source-map',
    //     devtool: 'eval-source-map'
    // }

    // rules: [
    //   {test: require.resolve("jquery"), use: "expose-loader?$"},
    //   {test: require.resolve("jquery"), use: "expose-loader?jQuery"},
    // ]

    // Use devtools source-map

    // configureWebpack: (config) => {
    //     config.module.rules.push({
    //         // Processing jquery
    //         test: require.resolve("jquery"),
    //         // use: [
    //         //     {
    //         //         loader: "expose-loader",
    //         //         options: "jQuery",
    //         //     },
    //         //     {
    //         //         loader: "expose-loader",
    //         //         options: "$",
    //         //     },
    //         // ],
    //         loader: "expose-loader",
    //         options: {
    //             exposes: {
    //                 globalName: "jQuery",
    //                 override: true,
    //             }
    //         },
    //         // [
    //         //     {
    //         //         loader: "expose-loader",
    //         //         options: "$",
    //         //     }
    //         // ],
    //     });
    // },

    // chainWebpack: config => {
    //   config.module
    //     .rule('expose')
    //     // .test(/\.graphql$/)
    //     .use('expose-loader')
    //       .loader('expose-loader')
    //       .end()
    // }
});
