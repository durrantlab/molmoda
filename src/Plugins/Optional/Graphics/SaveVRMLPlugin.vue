<template>
  <PluginComponent
    v-model="open"
    :infoPayload="infoPayload"
    actionBtnTxt="Save"
    @onPopupDone="onPopupDone"
    @onUserArgChanged="onUserArgChanged"
    @onMolCountsChanged="onMolCountsChanged"
  ></PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import * as api from "@/Api";
import {
  IContributorCredit,
  ISoftwareCredit,
} from "@/Plugins/PluginInterfaces";
import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
import {
  UserArg,
  IUserArgText,
  IUserArgCheckbox,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestCmd";
import {
  fileNameFilter,
  matchesFilename,
} from "@/FileSystem/FilenameManipulation";
import { FileInfo } from "@/FileSystem/FileInfo";
import { correctFilenameExt } from "@/FileSystem/FileUtils";
import { TestCmdList } from "@/Testing/TestCmdList";
import { dynamicImports } from "@/Core/DynamicImports";
import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { slugify } from "@/Core/Utils/StringUtils";
import { saveTxtFiles } from "@/FileSystem/LoadSaveMolModels/SaveMolModels/SaveMolModelsUtils";
import { runWorker } from "@/Core/WebWorkers/RunWorker";
import { checkAnyMolLoaded } from "@/Plugins/CheckUseAllowedUtils";

/**
 * SaveVRMLPlugin
 */
@Options({
  components: {
    PluginComponent,
  },
})
export default class SaveVRMLPlugin extends PluginParentClass {
  menuPath = "File/Graphics/3D Model...";
  title = "Save a VRML2 Model";
  softwareCredits: ISoftwareCredit[] = [dynamicImports.mol3d.credit];
  contributorCredits: IContributorCredit[] = [
    // {
    //   name: "Jacob D. Durrant",
    //   url: "http://durrantlab.com/",
    // },
  ];
  pluginId = "savevrml";

  intro = `Save the current molecular scene as a VRML2 file (3D model).`;
  tags = [Tag.Visualization];

  userArgDefaults: UserArg[] = [
    {
      id: "filename",
      label: "",
      val: "",
      placeHolder: "Filename (e.g., my_model.wrl)...",
      description: `The name of the VRML2 file to save. The extension ".wrl" will be automatically appended.`,
      filterFunc: (filename: string): string => {
        return fileNameFilter(filename);
      },
      validateFunc: (filename: string): boolean => {
        return matchesFilename(filename);
      },
    } as IUserArgText,
    {
      id: "simplifyMesh",
      label: "Simplify the mesh",
      description: `Reduce vertex count to shrink size, with some impact on mesh quality.`,
      val: true,
    } as IUserArgCheckbox,
  ];

  /**
   * Check if this plugin can currently be used.
   *
   * @returns {string | null}  If it returns a string, show that as an error
   *     message. If null, proceed to run the plugin.
   */
  checkPluginAllowed(): string | null {
    return checkAnyMolLoaded();
  }

  /**
   * Runs when the user presses the action button and the popup closes.
   */
  onPopupDone() {
    this.submitJobs([{ filename: this.getUserArg("filename") }]);
  }

  /**
   * Simplify the mesh.
   *
   * @param {string[][]} vrmlData  The VRML data to simplify.
   * @param {any}        mols      The molecules to simplify.
   * @returns {Promise<string[][]>}  The simplified VRML data.
   */
  private async _simplifyMesh(vrmlData: [string, string][], mols: any) {
    const simplifiedVrmlPromises = [];

    const newVrmlData: [string, string][] = [];

    for (const payload of vrmlData) {
      const [id, vrml] = payload;

      const mol = mols.filters.onlyId(id);
      if (!mol) {
        continue;
      }

      if (this.getUserArg("simplifyMesh") === true) {
        const worker = new Worker(
          new URL(
            "../../../Meshes/SimplifyVRML/SimplifyVRML.worker.ts",
            import.meta.url
          )
        );

        let reductionFraction = 0.5;
        let mergeCutoff = 0.15;
        const stylesJSONStr = JSON.stringify(mol.styles);
        if (stylesJSONStr.includes('"stick"')) {
          // This is a good one. Still some duplicate vertices, but not too bad.
          reductionFraction = 0.001;
          mergeCutoff = 0.15;
        } else if (stylesJSONStr.includes('"sphere"')) {
          // This one good
          reductionFraction = 1;
          mergeCutoff = 0.15;
        } else if (stylesJSONStr.includes('"surface"')) {
          // This one is good
          reductionFraction = 1;

          // You could put this to 0.75 or 1, but with small artifacts. Mesh with
          // this if you need even fewer verts.
          mergeCutoff = 0.5;
        } else if (stylesJSONStr.includes('"cartoon"')) {
          // This one is good
          reductionFraction = 0.4;
          mergeCutoff = 0.15;
        }

        simplifiedVrmlPromises.push(
          runWorker(worker, {
            vrmlContent: vrml,
            mergeCutoff,
            reductionFraction,
            id,
          })
        );
      }

      const resps = await Promise.all(simplifiedVrmlPromises);
      resps.forEach((resp) => {
        newVrmlData.push([resp.id, resp.optimizedVRML]);
        // vrmlData[resp.id] = resp.optimizedVRML;
      });
    }
    return newVrmlData;
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   *
   * @param {any} parameters  Information about the VRML file to save.
   */
  async runJobInBrowser(parameters: any): Promise<any> {
    let filename = parameters.filename;
    const viewer = await api.visualization.viewer;

    const vrmlData = viewer.exportVRMLPerModel();
    viewer.renderAll();

    const mols = getMoleculesFromStore();

    let newVrmlData: [string, string][] = [];
    if (this.getUserArg("simplifyMesh") === true) {
      // Simplify meshes
      newVrmlData = await this._simplifyMesh(vrmlData, mols);
    } else {
      newVrmlData = vrmlData;
    }

    const files: FileInfo[] = [];
    for (const payload of newVrmlData) {
      const [id, vrml] = payload;

      const mol = mols.filters.onlyId(id);
      if (!mol) {
        continue;
      }

      const filename = slugify(mol.descriptions.pathName("_", 0));

      if (vrml !== "") {
        const fileInfo = new FileInfo({
          name: filename + ".wrl",
          contents: vrml,
        });

        files.push(fileInfo);
      }
    }

    filename = correctFilenameExt(filename, "zip");

    saveTxtFiles(files, filename);

    return;
  }

  /**
   * Gets the test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest}  The selenium test commands.
   */
  async getTests(): Promise<ITest> {
    return {
      beforePluginOpens: new TestCmdList().loadExampleMolecule(),
      pluginOpen: new TestCmdList().setUserArg(
        "filename",
        "test",
        this.pluginId
      ),
      afterPluginCloses: new TestCmdList().waitUntilRegex(
        "#log",
        "Job savevrml.*? ended"
      ),
    };
  }
}
</script>

<style scoped lang="scss"></style>
