import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

export interface IDynamicImport {
    credit: ISoftwareCredit;
    module: Promise<any>
}

export const dynamicImports = {
    jsZip: {
        credit: {
            name: "JSZip",
            url: "https://stuk.github.io/jszip/",
            license: Licenses.MIT
        },
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "jszip" */
                /* webpackMode: "lazy" */
                "jszip"
            ).then((mod) => {
                return mod.default;
            });
        }
    } as IDynamicImport,
    fileSaver: {
        credit: {
            name: "FileSaver.js",
            url: "https://github.com/eligrey/FileSaver.js/",
            license: Licenses.MIT
        },
        get module(): Promise<any> {
            return import(
                /* webpackChunkName: "filesaver" */
                /* webpackMode: "lazy" */
                "file-saver"
            ).then((mod) => {
                return mod.default;
            });
        }
    } as IDynamicImport,
}

    

