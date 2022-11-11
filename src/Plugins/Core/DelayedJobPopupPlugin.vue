<template>
  <PluginComponent
    :title="'Preparing ' + prettyJobType + ' Job'"
    v-model="open"
    :cancelBtnTxt="''"
    actionBtnTxt="Run"
    @onPopupDone="runDelayedJob"
    actionBtnTxt2="Cancel"
    @onPopupDone2="cancelJob"
    :actionBtnTxt3="'Cancel All ' + prettyJobType"
    @onPopupDone3="cancelAllJobsOfType"
    actionBtnTxt4="Cancel All"
    @onPopupDone4="cancelAllJobs"
    @onClosed="onClosed"
    :userArgs="userArgs"
    :pluginId="pluginId"
  >
    <p>
      Preparing to run a {{ prettyJobType }} job (id: {{ jobId.substring(3) }}).
    </p>

    <Alert type="warning">
      {{ prettyJobType }} jobs are resource intensive and may impact your
      computer's overall performance. For example, this browser tab might freeze
      during the calculation.
    </Alert>

    <p>
      You may choose to <i>Run</i> the job now, <i>Cancel</i> the job,
      <i>Cancel All {{ prettyJobType }}</i> jobs, or <i>Cancel All</i> jobs
      regardless of type.
    </p>

    <p>
      Your job will start automatically in {{ Math.ceil((totalWaitTime -
      waitTimePassed) / 1000) }} seconds.
    </p>
  </PluginComponent>
</template>

<script lang="ts">
import { Options } from "vue-class-component";
import Popup from "@/UI/Layout/Popups/Popup.vue";
import { IContributorCredit, ISoftwareCredit } from "../PluginInterfaces";
import { IDelayedJobPopup } from "@/UI/Layout/Popups/InterfacesAndEnums";
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { FormElement } from "@/UI/Forms/FormFull/FormFullInterfaces";
import Alert from "@/UI/Layout/Alert.vue";
import { capitalize } from "@/Core/Utils";

/**
 * SimpleMsgPlugin
 */
@Options({
  components: {
    Popup,
    PluginComponent,
    Alert,
  },
})
export default class DelayedJobPopupPlugin extends PluginParentClass {
  // @Prop({ required: true }) message!: string;

  menuPath = null;
  softwareCredits: ISoftwareCredit[] = [];
  contributorCredits: IContributorCredit[] = [
    {
      name: "Jacob D. Durrant",
      url: "http://durrantlab.com/",
    },
  ];
  pluginId = "delayedjobpopup";

  // Below set via onPluginStart.
  // message = "";
  runDelayedJobCallback: any;
  cancelDelayedJobCallback: any;
  cancelAllDelayedJobsOfTypeCallback: any;
  cancelAllJobsCallback: any;
  waitTimePassed = 0;
  totalWaitTime = 0;
  jobType = "";
  jobId = "";

  userArgs: FormElement[] = [];
  alwaysEnabled = true;
  logJob = false;

  /**
   * Runs when the user first starts the plugin. For example, if the plugin is
   * in a popup, this function would open the popup.
   *
   * @param {IDelayedJobPopup} [payload]  Information about the message to display.
   */
  onPluginStart(payload: IDelayedJobPopup) {
    // this.message = payload.message;
    // this.callBack = payload.callBack;
    // this.neverClose =
    //   payload.neverClose === undefined ? false : payload.neverClose;
    this.runDelayedJobCallback = payload.runDelayedJob;
    this.cancelDelayedJobCallback = payload.cancelDelayedJob;
    this.cancelAllDelayedJobsOfTypeCallback =
      payload.cancelAllDelayedJobsOfType;
    this.cancelAllJobsCallback = payload.cancelAllJobs;
    this.open = payload.open !== undefined ? payload.open : true;
    this.waitTimePassed =
      payload.waitTimePassed !== undefined ? payload.waitTimePassed : 0;
    this.totalWaitTime =
      payload.totalWaitTime !== undefined ? payload.totalWaitTime : 0;
    this.jobType = payload.jobType !== undefined ? payload.jobType : "";
    this.jobId = payload.jobId !== undefined ? payload.jobId : "";
  }

  /**
   * Formats the jobType (capitalizes the first letter).
   * 
   * @returns {string}  The formatted jobType.
   */
  get prettyJobType(): string {
    return capitalize(this.jobType);
  }

  /**
   * Runs when the user closes the simple message popup.
   */
  onClosed() {
    this.submitJobs();
  }

  /**
   * Every plugin runs some job. This is the function that does the job running.
   */
  runJobInBrowser() {
    return;
  }

  /**
   * Runs when the user clicks the "Run" button.
   */
  runDelayedJob() {
    this.runDelayedJobCallback();
  }

  /**
   * Runs when the user clicks the "Cancel" button.
   */
  cancelJob() {
    this.cancelDelayedJobCallback();
  }

  /**
   * Runs when the user clicks the "Cancel All <jobType>" button.
   */
  cancelAllJobsOfType() {
    this.cancelAllDelayedJobsOfTypeCallback();
  }

  /**
   * Runs when the user clicks the "Cancel All" button.
   */
  cancelAllJobs() {
    this.cancelAllJobsCallback();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

