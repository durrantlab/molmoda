<template>
    <PluginComponent
   v-model="open"
   :infoPayload="infoPayload"
   actionBtnTxt="Rename"
   @onPopupDone="onPopupDone"
   @onUserArgChanged="onUserArgChanged"
   @onMolCountsChanged="onMolCountsChanged"
    ></PluginComponent>
  </template>
  <script lang="ts">
  import { Options } from "vue-class-component";
  import { IContributorCredit, ISoftwareCredit } from "../../PluginInterfaces";
  import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";
  import PluginComponent from "@/Plugins/Parents/PluginComponent/PluginComponent.vue";
  import { UserArg, IUserArgText } from "@/UI/Forms/FormFull/FormFullInterfaces";
  import { setStoreVar } from "@/Store/StoreExternalAccess";
  import { Tag } from "@/Plugins/Core/ActivityFocus/ActivityFocusUtils";
  import { ITest } from "@/Testing/TestInterfaces";
  import { TestCmdList } from "@/Testing/TestCmdList";
  
  /**
   * RenameProjectPlugin
   */
  @Options({
    components: {
   PluginComponent,
    },
  })
  export default class RenameProjectPlugin extends PluginParentClass {
    menuPath = "File/[1] Project/[2] Rename...";
    title = "Rename Project";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "renameproject";
    intro = "Rename the current project.";
    details = "This plugin changes the title of the project, which is also used as the default filename when saving.";
    tags = [Tag.All];
    userArgDefaults: UserArg[] = [
   {
     id: "newProjectTitle",
     label: "Project title",
     val: "",
     placeHolder: "New project title...",
     description: "The new title for the current project.",
     validateFunc: (val: string) => val.trim().length > 0,
   } as IUserArgText,
    ];
    logJob = false;
  
    /**
     * Runs before the popup opens. Populates the input with the current project title.
     *
     * @param {any} payload The payload passed to the plugin.
     * @returns {Promise<void>}
     */
    async onBeforePopupOpen(payload: any): Promise<void> {
   this.setUserArg("newProjectTitle", this.$store.state.projectTitle);
    }
  
    /**
     * Runs when the user presses the action button and the popup closes.
     */
    onPopupDone() {
   const newTitle = this.getUserArg("newProjectTitle");
   setStoreVar("projectTitle", newTitle);
   this.closePopup();
    }
  
    /**
     * Each plugin is associated with specific jobs. This plugin has no job to run.
     *
     * @returns {Promise<void>}
     */
    async runJobInBrowser(): Promise<void> {
   return Promise.resolve(); // No async job, onPopupDone handles it.
    }
  
    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest} The selenium test commands.
     */
    async getTests(): Promise<ITest> {
   return {
     beforePluginOpens: () => new TestCmdList().loadExampleMolecule(),
     pluginOpen: () => new TestCmdList().setUserArg(
    "newProjectTitle",
    "My New Project Name",
    this.pluginId
     ),
     afterPluginCloses: () => new TestCmdList(), // Vuex store change will be tested by tab title change which is not easy to check here.
   };
    }
  }
  </script>