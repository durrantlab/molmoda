import { ISoftwareCredit, Licenses } from "@/Plugins/PluginInterfaces";

// These are credits that aren't associated with a specific plugin.
export const globalCredits: ISoftwareCredit[] = [
    {
      name: "webpack",
      url: "https://webpack.js.org/",
      license: Licenses.MIT,
    },
    {
      name: "TypeScript",
      url: "https://www.typescriptlang.org/",
      license: Licenses.APACHE2,
    },
    {
      name: "Bootstrap",
      url: "https://getbootstrap.com/",
      license: Licenses.MIT,
    },
    {
      name: "Vue.js",
      url: "https://vuejs.org/",
      license: Licenses.MIT,
    },
    {
      name: "3Dmol.js",
      url: "https://3dmol.csb.pitt.edu/",
      license: Licenses.BSD3,
    },
    {
      name: "GoldenLayout",
      url: "https://golden-layout.com/",
      license: Licenses.MIT,
    },
    {
      name: "Vuex",
      url: "https://vuex.vuejs.org/",
      license: Licenses.MIT,
    },
  ];