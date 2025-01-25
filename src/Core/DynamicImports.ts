import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";
import { waitForCondition } from "./Utils/MiscUtils";

interface IDynamicImport {
    credit: ISoftwareCredit;
    module: Promise<any>;
}

const modulesAlreadyAddedToHeader: { [key: string]: Promise<any> } = {};

/**
 * Adds a js file to the header. This is useful when you can't do a legitimate
 * dynamic import.
 *
 * @param  {string}   id         The id of the library.
 * @param  {string}   jsUrl      The url of the js file to add to the header.
 * @param  {Function} getModule  A function that returns the module.
 * @param  {string}   cssUrl     The url of the css file to add to the header.
 * @returns {Promise<undefined>}  A promise that resolves when the script is
 *     loaded.
 */
function addToHeader(
    id: string,
    jsUrl: string,
    getModule: () => any,
    cssUrl?: string
): Promise<any> {
    if (modulesAlreadyAddedToHeader[id] !== undefined) {
        // Already loaded;
        // (window as any)["OpenBabel"] =
        //     modulesAlreadyAddedToHeader[id];
        return Promise.resolve(modulesAlreadyAddedToHeader[id]);
    }

    // Add css to header
    if (cssUrl) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.type = "text/css";
        css.href = cssUrl;
        document.head.appendChild(css);
    }

    modulesAlreadyAddedToHeader[id] = new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = jsUrl;
        script.onload = async () => {
            await waitForCondition(() => {
                return getModule() !== undefined;
            }, 100);

            resolve(getModule());
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
    kekule: {
        credit: {
            name: "Kekule.js",
            url: "https://partridgejiang.github.io/Kekule.js/",
            license: Licenses.MIT,
            citations: [
                {
                    title: "Kekule.js: An Open Source JavaScript Chemoinformatics Toolkit",
                    authors: ["Jiang, Chen", "Jin, Xi"],
                    journal: "J. Chem. Inf. Model.",
                    year: 2016,
                    volume: 56,
                    issue: 6,
                    pages: "1132-1138",
                },
            ],
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return addToHeader(
                "kekule",
                "js/kekule/kekule.min.js",
                () => (window as any).Kekule,
                "js/kekule/kekule.css"
            );

            // const themePromise = import(
            //     /* webpackChunkName: "kekule-theme" */
            //     /* webpackMode: "lazy" */
            //     /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
            //     // @ts-ignore
            //     "kekule/theme/default"
            // );
            // const libPromise = import(
            //     /* webpackChunkName: "kekule" */
            //     /* webpackMode: "lazy" */
            //     /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
            //     // @ts-ignore
            //     "kekule"
            // );

            // return Promise.all([themePromise, libPromise]).then(
            //     (mods: any[]) => {
            //         return mods[1];
            //     }
            // );
        },
    } as IDynamicImport,
    indigo: {
        credit: {
            name: "Indigo",
            url: "https://lifescience.opensource.epam.com/indigo/index.html",
            license: Licenses.APACHE2,
            citations: [
                {
                    title: "Indigo: universal cheminformatics API",
                    authors: ["Pavlov, D", "Rybalkin, M", "Karulin, B", "Kozhevnikov, M", "Savelyev, A", "Churinov, A"],
                    journal: "J. Cheminform.",
                    year: 2011,
                    volume: 3,
                    issue: "Suppl 1",
                    pages: "P4",
                },                             
                {
                    title: "Kekule.js: An Open Source JavaScript Chemoinformatics Toolkit",
                    authors: ["Jiang, Chen", "Jin, Xi"],
                    journal: "J. Chem. Inf. Model.",
                    year: 2016,
                    volume: 56,
                    issue: 6,
                    pages: "1132-1138",
                },
            ],
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any>{
            return addToHeader(
                "indigo",
                "js/indigo/indigo.js",
                () => {
                    // var Indigo = CreateIndigo();

                    return (window as any).IndigoModule
                },
            )
            .then(() => {
                return addToHeader(
                    "indigoadapter",
                    "js/indigo/indigoAdapter.js",
                    () => {
                        // var Indigo = CreateIndigo();
    
                        return (window as any).CreateIndigo
                    },
                )
            })
            .then(() => {
                return (window as any).CreateIndigo();
            })
            .then((Indigo: any) => {
                return new Promise((resolve) => {
                    Indigo.Module.onRuntimeInitialized = () => {
                        resolve(Indigo);
                    }
                });
            })
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
    chartJs: {
        credit: {
            name: "Chart.js",
            url: "https://www.chartjs.org/",
            license: Licenses.MIT,
        },

        /**
         * Gets the Chart.js module.
         *
         * @returns {Promise<any>} A promise that resolves to the Chart.js module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "chartjs" */
                /* webpackMode: "lazy" */
                "chart.js/auto"
            );
        },
    } as IDynamicImport,
    mol3d: {
        credit: {
            name: "3Dmol.js",
            url: "https://3dmol.csb.pitt.edu/",
            license: Licenses.BSD3,
            citations: [
                {
                    title: "3Dmol.js: molecular visualization with WebGL",
                    authors: ["Rego, Nicholas", "Koes, David"],
                    journal: "Bioinformatics",
                    year: 2015,
                    volume: 31,
                    issue: 8,
                    pages: "1322-1324",
                },
            ],
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
                "@/libs/3Dmol-nojquery"
                // "@/libs/3Dmol"
                // "@/libs/3Dmol-nojquery.JDD"
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
            license: Licenses.CUSTOM,
            citations: [
                {
                    title: "Asparagine and glutamine: using hydrogen atom contacts in the choice of side-chain amide orientation",
                    authors: ["Word, J. Michael", "Lovell, Simon C."],
                    journal: "J. Mol. Biol.",
                    year: 1999,
                    volume: 285,
                    issue: 4,
                    pages: "1735-1747",
                },
            ],
        },
        // get module(): Promise<any> {
        //     return import(
        //         /* webpackChunkName: "reduce" */
        //         /* webpackMode: "lazy" */
        //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //         // @ts-ignore
        //         "../../public/js/reduce/index.js"
        //     ).then((mod) => {
        //         return mod.default;
        //     });
        // }
    } as IDynamicImport,
    webina: {
        credit: {
            name: "Webina",
            url: "https://durrantlab.pitt.edu/webina-download/",
            license: Licenses.APACHE2,
            citations: [
                {
                    title: "Webina: an open-source library and web app that runs AutoDock Vina entirely in the web browser",
                    authors: ["Kochnev, Yuri", "Hellemann, Erich"],
                    journal: "Bioinformatics",
                    year: 2020,
                    volume: 36,
                    issue: 16,
                    pages: "4513-4515",
                },
            ],
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
            citations: [
                {
                    title: "Open Babel: An open chemical toolbox",
                    authors: ["O'Boyle, Noel M", "Banck, Michael"],
                    journal: "J. Cheminformatics",
                    year: 2011,
                    volume: 3,
                    issue: 1,
                    pages: "1-14",
                },
            ],
        },
    },
    smilesdrawer: {
        credit: {
            name: "smilesdrawer",
            url: "https://github.com/reymond-group/smilesDrawer",
            license: Licenses.MIT,
            citations: [
                {
                    title: "SmilesDrawer: Parsing and Drawing SMILES-Encoded Molecular Structures Using Client-Side JavaScript",
                    authors: ["Probst, Daniel", "Reymond, Jean-Louis"],
                    journal: "J. Chem. Inf. Model.",
                    year: 2018,
                    volume: 58,
                    issue: 1,
                    pages: "1-7",
                },
            ],
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
            // NOTE: Couldn't find citation. I don't think there is an official
            // citation as of Aug 31, 2023.
        },
        /**
         * Gets the module.
         * 
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return addToHeader(
                "rdkitjs",
                "js/rdkitjs/RDKit_minimal.js",
                () => (window as any).initRDKitModule
            )
                .then(() => {
                    return (window as any).initRDKitModule();
                })
                .then((instance: any) => {
                    return instance;
                });
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
            citations: [
                {
                    title: "FPocketWeb: protein pocket hunting in a web browser",
                    authors: ["Kochnev, Yuri", "Durrant, Jacob D"],
                    journal: "J. Cheminformatics",
                    year: 2022,
                    volume: 14,
                    issue: 1,
                    pages: "58",
                },
            ],
        },
    },

    dexie: {
        credit: {
            name: "dexie",
            url: "https://github.com/dexie/Dexie.js",
            license: Licenses.APACHE2,
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "dexie" */
                /* webpackMode: "lazy" */
                "dexie"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    },

    exitIntent: {
        credit: {
            name: "exit-intent",
            url: "https://github.com/danhayden/exit-intent",
            license: Licenses.MIT
        },
        /**
         * Gets the module.
         *
         * @returns {Promise<any>}  A promise that resolves to the module.
         */
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "exit-intent" */
                /* webpackMode: "lazy" */
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "exit-intent"
            ).then((mod: any) => {
                return mod.default;
            });
        },
    }
};
