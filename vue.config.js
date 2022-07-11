const { defineConfig } = require("@vue/cli-service");
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
