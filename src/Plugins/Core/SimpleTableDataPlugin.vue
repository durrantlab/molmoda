<template>
  <PluginComponent :infoPayload="infoPayload" v-model="open" cancelBtnTxt="Ok" actionBtnTxt="" @onClosed="onClosed"
    variant="info" @onUserArgChanged="onUserArgChanged" modalWidth="xl" @onMolCountsChanged="onMolCountsChanged">
    <p v-if="message !== ''">{{ message }}</p>
    <Table :tableData="tableData" :caption="caption" :precision="precision" :noFixedTable="true"
      :downloadFilenameBase="downloadFilenameBase" />
  </PluginComponent>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options } from "vue-class-component";
import Popup from "@/UI/MessageAlerts/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { ITableDataMsg } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { UserArg } from "@/UI/Forms/FormFull/FormFullInterfaces";
import { ITest } from "@/Testing/TestInterfaces";
import { pluginsApi } from "@/Api/Plugins";
import { Tag } from "./ActivityFocus/ActivityFocusUtils";
import { ITableData } from "@/UI/Components/Table/Types";
import Table from "@/UI/Components/Table/Table.vue";

/**
 * SimpleMsgPlugin
 */
@Options({
  components: {
    Popup,
    PluginComponent,
    Table
  },
})
export default class SimpleTableDataPlugin extends PluginParentClass {
  menuPath = null;
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [];
  pluginId = "tabledatapopup";
  intro = "Display data in a table format.";
  details = "This is a system plugin used to show tabular data in a sortable, downloadable format.";
  tags = [Tag.All];

  // Below set via onPluginStart.
  tableData: ITableData = {
    headers: [],
    rows: [],
  };

  title = "Table Data";
  message = "";
  precision = 3;
  caption = "";
  downloadFilenameBase = "";
  showInQueue = false;

  userArgDefaults: UserArg[] = [];

  logJob = false;

  /**
   * Runs when the user first starts the plugin. For example, if the plugin is
   * in a popup, this function would open the popup.
   *
   * @param {ITableDataMsg} [payload]  Information about the table message to
   *                                   display.
   * @returns {Promise<void>}          Promise that resolves when the plugin is
   *                                   finished starting.
   */
  async onPluginStart(payload: ITableDataMsg): Promise<void> {
    this.tableData = payload.tableData;
    this.title = payload.title;
    this.message = payload.message;
    this.caption = payload.caption;
    this.precision = payload.precision !== undefined ? payload.precision : 3;
    this.downloadFilenameBase = payload.downloadFilenameBase || payload.caption;
    this.open = payload.open !== undefined ? payload.open : true;
  }

  /**
   * Runs when the user closes the simple message popup.
   */
  onClosed() {
    this.submitJobs();
  }

  /**
   * Every plugin runs some job. This is the function that does the job
   * running.
   *
   * @returns {Promise<void>}  A promise that resolves when the job is done.
   */
  runJobInBrowser(): Promise<void> {
    this.tableData = {
      headers: [],
      rows: [],
    };
    return Promise.resolve();
  }

  /**
   * Gets the test commands for the plugin. For advanced use.
   *
   * @gooddefault
   * @document
   * @returns {ITest[]}  The selenium test commands.
   */
  async getTests(): Promise<ITest[]> {
    // Not going to test closing, etc. (Too much work.) But at least opens
    // to see if an error occurs.

    pluginsApi.runPlugin(this.pluginId, {
      title: "Test Title",
      message: "Test message",
      open: true, // open
    } as ITableDataMsg);

    return [];
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
