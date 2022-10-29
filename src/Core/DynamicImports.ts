import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

export interface IDynamicImport {
    credit: ISoftwareCredit;
    module: Promise<any>;
}

const modulesAlreadyAddedToHeader: { [key: string]: Promise<any> } = {};

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
function addJsToHeader(
    id: string,
    url: string,
    callback: () => Promise<any>
): Promise<undefined> {
    if (modulesAlreadyAddedToHeader[id] !== undefined) {
        // Already loaded;
        // (window as any)["OpenBabel"] =
        //     modulesAlreadyAddedToHeader[id];
        return Promise.resolve(modulesAlreadyAddedToHeader[id]);
    }

    modulesAlreadyAddedToHeader[id] = new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => {
            setTimeout(() => {
                callback() // custom callback returns a promise
                    .then((module) => {
                        resolve(module);
                        return;
                    })
                    .catch(() => {
                        console.warn("error");
                        return;
                    });
            }, 5000);
        };
        document.head.appendChild(script);
    });

    return modulesAlreadyAddedToHeader[id];
}

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
                "@/libs/ToImport/3Dmol-nojquery.JDD"
            ).then(($3Dmol) => {
                return $3Dmol;
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
    openbabeljs: {
        credit: {
            name: "openbabeljs",
            url: "https://github.com/partridgejiang/cheminfo-to-web/tree/master/OpenBabel3",
            license: Licenses.GPL2,
        },

        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            // NOTE: Unfortunately, the only way I could get this to work was by
            // attaching it to the main window. A promise that resolves the
            // module is not effective for some reason.

            return addJsToHeader(
                "openbabeljs",
                "js/openbabeljs/openbabel.js",
                () => {
                    const OpenBabel = (window as any)["OpenBabelModule"]();
                    const prom1 = new Promise((resolve) => {
                        OpenBabel.onRuntimeInitialized = () => {
                            resolve(undefined);
                        };
                    });
                    const prom2 = new Promise(function (resolve) {
                        const checkReady = () => {
                            console.log("checking");
                            if (OpenBabel.ObConversionWrapper) {
                                (window as any)["OpenBabel"] = OpenBabel;
                                resolve(undefined);
                            } else {
                                setTimeout(checkReady, 500);
                            }
                        };
                        checkReady();
                    });
                    return Promise.all([prom1, prom2]);
                }
            );

            // if (modulesAlreadyAddedToHeader["openbabeljs"] !== undefined) {
            //     // Already loaded;
            //     (window as any)["OpenBabel"] =
            //         modulesAlreadyAddedToHeader["openbabeljs"];
            //     return Promise.resolve(undefined);
            // }

            // return addJsToHeader("js/openbabeljs/openbabel.js").then(() => {
            //     const OpenBabel = (window as any)["OpenBabelModule"]();
            //     const prom1 = new Promise((resolve) => {
            //         OpenBabel.onRuntimeInitialized = () => {
            //             resolve(undefined);
            //         };
            //     });
            //     const prom2 = new Promise(function (resolve) {
            //         const checkReady = () => {
            //             console.log("checking");
            //             if (OpenBabel.ObConversionWrapper) {
            //                 (window as any)["OpenBabel"] = OpenBabel;
            //                 modulesAlreadyAddedToHeader["openbabeljs"] =
            //                     OpenBabel;
            //                 resolve(undefined);
            //             } else {
            //                 setTimeout(checkReady, 500);
            //             }
            //         };
            //         checkReady();
            //     });
            //     return Promise.all([prom1, prom2]);
            // });
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
    rdkitjs: {
        credit: {
            name: "rdkitjs",
            url: "https://github.com/rdkit/rdkit-js",
            license: Licenses.BSD3,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return addJsToHeader(
                "rdkitjs",
                "js/rdkitjs/RDKit_minimal.js",
                () => {
                    return (window as any).initRDKitModule().catch(() => {
                        // handle loading errors here...
                    });
                }
            );
        },
    },
};
