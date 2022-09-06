/* eslint-disable @typescript-eslint/ban-ts-comment */

import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

export interface IDynamicImport {
    credit: ISoftwareCredit;
    module: Promise<any>;
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
};
