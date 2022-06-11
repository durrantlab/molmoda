const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
    transpileDependencies: true,
    // rules: [
    //   {test: require.resolve("jquery"), use: "expose-loader?$"},
    //   {test: require.resolve("jquery"), use: "expose-loader?jQuery"},
    // ]
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
