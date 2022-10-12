// const TerserPlugin = require("terser-webpack-plugin");
const { defineConfig } = require("@vue/cli-service");
const CopyPlugin = require("copy-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");

module.exports = defineConfig({
    transpileDependencies: true,
    productionSourceMap: true,
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
        };
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    { from: "src/libs/ToCopy/jquery-3.6.0.min.js", to: "js/" },
                    {
                        from: "src/libs/ToCopy/obabel-wasm",
                        to: "js/obabel-wasm",
                    },
                    {
                        from: "src/Testing/4WP4.pdb",
                        to: "4WP4.pdb",
                    }
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
