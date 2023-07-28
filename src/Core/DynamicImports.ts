import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

interface IDynamicImport {
    credit: ISoftwareCredit;
    module: Promise<any>;
}

// const modulesAlreadyAddedToHeader: { [key: string]: Promise<any> } = {};

/**
 * Adds a js file to the header. This is useful when you can't do a legitimate
 * dynamic import.
 *
 * @param  {string} id          The id of the library.
 * @param  {string} url         The url of the js file to add to the header.
 * @param  {Function} callback  The callback to call when the library is loaded.
 * @returns {Promise<undefined>}  A promise that resolves when the script is
 *     loaded.
 */
// function addJsToHeader(
//     id: string,
//     url: string,
//     callback: () => Promise<any>
// ): Promise<undefined> {
//     if (modulesAlreadyAddedToHeader[id] !== undefined) {
//         // Already loaded;
//         // (window as any)["OpenBabel"] =
//         //     modulesAlreadyAddedToHeader[id];
//         return Promise.resolve(modulesAlreadyAddedToHeader[id]);
//     }

//     modulesAlreadyAddedToHeader[id] = new Promise((resolve) => {
//         const script = document.createElement("script");
//         script.src = url;
//         script.onload = () => {
//             setTimeout(() => {
//                 callback() // custom callback returns a promise
//                     .then((module) => {
//                         resolve(module);
//                         return;
//                     })
//                     .catch((err) => {
//                         throw err;
//                     });
//             }, 5000);
//         };
//         document.head.appendChild(script);
//     });

//     return modulesAlreadyAddedToHeader[id];
// }

export const dynamicImports = {
    jsZip: {
        credit: {
            name: "JSZip",
            url: "https://stuk.github.io/jszip/",
            license: Licenses.MIT,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "jszip" */
                /* webpackMode: "lazy" */
                "jszip"
            ).then((mod) => {
                return mod.default;
            });
        },
    } as IDynamicImport,
    fileSaver: {
        credit: {
            name: "FileSaver.js",
            url: "https://github.com/eligrey/FileSaver.js/",
            license: Licenses.MIT,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "filesaver" */
                /* webpackMode: "lazy" */
                "file-saver"
            ).then((mod) => {
                return mod.default;
            });
        },
    } as IDynamicImport,
    mol3d: {
        credit: {
            name: "3Dmol.js",
            url: "https://3dmol.csb.pitt.edu/",
            license: Licenses.BSD3,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "3dmol" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "@/libs/3Dmol-nojquery.JDD"
            ).then(($3Dmol) => {
                return $3Dmol;
            });
        },
    } as IDynamicImport,

    // ngl: {
    //     credit: {
    //         name: "NGL Viewer",
    //         url: "https://github.com/nglviewer/ngl",
    //         license: Licenses.MIT,
    //     },

    //     /**
    //      * Gets the module.
    //      *
    //      * @returns {Promise<any>}  A promise that resolves to the module.
    //      */
    //     get module(): Promise<any> {
    //         return import(
    //             /* webpackChunkName: "ngl" */
    //             /* webpackMode: "lazy" */
    //             // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //             // @ts-ignore
    //             "ngl"
    //         ).then((ngl) => {
    //             return ngl;
    //         });
    //     },
    // } as IDynamicImport,

    reduce: {
        credit: {
            name: "Reduce",
            url: "https://github.com/rlabduke/reduce",
            license: Licenses.APACHE2,  // TODO: Not true. Need custom license option.
        },
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "reduce" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "../../public/js/reduce/index.js"
            ).then((mod) => {
                return mod.default;
            });
        }
    } as IDynamicImport,
    webina: {
        credit: {
            name: "Webina",
            url: "https://durrantlab.pitt.edu/webina-download/",
            license: Licenses.APACHE2,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "webina" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "../../public/js/webina/vina.js"
            ).then((mod) => {
                return mod.default;
            });
        },
    } as IDynamicImport,

    hotkeys: {
        credit: {
            name: "HotKeys.js",
            url: "https://github.com/jaywcjlove/hotkeys",
            license: Licenses.MIT,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "hotkeys" */
                /* webpackMode: "lazy" */
                "hotkeys-js"
            ).then((hotkeys) => {
                return hotkeys.default;
            });
        },
    } as IDynamicImport,

    detectOs: {
        credit: {
            name: "Detect OS",
            url: "https://github.com/jankapunkt/js-detect-os",
            license: Licenses.MIT,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "detect-os" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "detect-os"
            ).then((detectOs) => {
                return detectOs.default;
            });
        },
    } as IDynamicImport,

    memfs: {
        credit: {
            name: "memfs",
            url: "https://github.com/streamich/memfs",
            license: Licenses.PUBLICDOMAIN,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "memfs" */
                /* webpackMode: "lazy" */
                "memfs"
            ).then((memfs) => {
                return memfs;
            });
        },
    },
    browserfs: {
        credit: {
            name: "browserfs",
            url: "https://github.com/jvilk/BrowserFS",
            license: Licenses.MIT,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "browserfs" */
                /* webpackMode: "lazy" */
                "browserfs"
            ).then((browserfs) => {
                return browserfs;
            });
        },
    },
    obabelwasm: {
        // This is just to give credit to open babel.
        credit: {
            name: "Open Babel",
            url: "https://openbabel.org/wiki/Main_Page",
            license: Licenses.GPL2,
        },
    },
    smilesdrawer: {
        credit: {
            name: "smilesdrawer",
            url: "https://github.com/reymond-group/smilesDrawer",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "smilesdrawer" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "smiles-drawer"
            ).then((SmilesDrawer) => {
                return SmilesDrawer;
            });
        },
    },
    axios: {
        credit: {
            name: "axios",
            url: "https://github.com/axios/axios",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "axios" */
                /* webpackMode: "lazy" */
                "axios"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },
    rdkitjs: {
        // Always called from webworker
        credit: {
            name: "rdkitjs",
            url: "https://github.com/rdkit/rdkit-js",
            license: Licenses.BSD3,
        },
    },
    sheetsjs: {
        credit: {
            name: "SheetJS Community Edition",
            url: "https://git.sheetjs.com/sheetjs/sheetjs",
            license: Licenses.APACHE2,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "sheetsjs" */
                /* webpackMode: "lazy" */
                "xlsx"
            ).then((sheetsjs) => {
                return sheetsjs;
            });
        },
    },

    bootstrapModal: {
        credit: {
            name: "Bootstrap",
            url: "https://getbootstrap.com/",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "bootstrap-modal" */
                /* webpackMode: "lazy" */
                "bootstrap/js/dist/modal"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },

    bootstrapTooltip: {
        credit: {
            name: "Bootstrap",
            url: "https://getbootstrap.com/",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "bootstrap-tooltip" */
                /* webpackMode: "lazy" */
                "bootstrap/js/dist/tooltip"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },

    bootstrapCollapse: {
        credit: {
            name: "Bootstrap",
            url: "https://getbootstrap.com/",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "bootstrap-collapse" */
                /* webpackMode: "lazy" */
                "bootstrap/js/dist/collapse"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },
    bootstrapDropdown: {
        credit: {
            name: "Bootstrap",
            url: "https://getbootstrap.com/",
            license: Licenses.MIT,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "bootstrap-dropdown" */
                /* webpackMode: "lazy" */
                "bootstrap/js/dist/dropdown"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },

    fpocketweb: {
        // Called directly from webworker
        credit: {
            name: "fpocketweb",
            url: "https://git.durrantlab.pitt.edu/jdurrant/fpocketweb",
            license: Licenses.APACHE2,
        },
    },
};
