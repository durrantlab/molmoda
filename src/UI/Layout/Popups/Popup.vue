<template>
  <div
    class="modal fade"
    :id="id"
    tabindex="-1"
    @keypress="onKeypress"
    data-bs-backdrop="static"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div :class="headerClasses">
          <h5 class="modal-title">{{ title }}</h5>
          <button
            v-if="cancelXBtn && !prohibitCancel"
            type="button"
            :class="'btn-close ' + (styling === 0 ? 'btn-close-white' : '')"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body" style="overflow: hidden">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <button
            v-if="cancelBtnTxt && !prohibitCancel"
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            {{ cancelBtnTxt }}
          </button>
          <button
            v-if="actionBtnTxt"
            type="button"
            :disabled="!isActionBtnEnabled"
            class="btn btn-primary"
            @click="actionBtn"
          >
            {{ actionBtnTxt }}
          </button>
          <!-- :disabled="!isActionBtnEnabled" -->
          <button
            v-if="actionBtnTxt2"
            type="button"
            class="btn btn-primary"
            @click="actionBtn2"
          >
            {{ actionBtnTxt2 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Modal from "bootstrap/js/dist/modal";
import { randomID } from "@/Core/Utils";
import { PopupVariant } from "./InterfacesAndEnums";
import { FORM_INPUT_DELAY_UPDATE_DEFAULT } from "@/UI/Forms/FormInput.vue";

/**
 * Popup component
 */
@Options({
  components: {},
})
export default class Popup extends Vue {
  @Prop({ required: true }) modelValue!: any;
  @Prop({ default: "My Title" }) title!: string;
  @Prop() cancelBtnTxt!: string; // If undefined, no cancel button
  @Prop() actionBtnTxt!: string; // If undefined, no ok button
  @Prop({ default: "" }) actionBtnTxt2!: string; // If undefined, no ok button
  @Prop({ default: true }) cancelXBtn!: boolean;
  @Prop({ default: true }) isActionBtnEnabled!: boolean;
  @Prop({ default: false }) prohibitCancel!: boolean;
  @Prop({ default: PopupVariant.PRIMARY }) variant!: PopupVariant;
  @Prop({}) onShown!: Function;
  @Prop({}) beforeShown!: Function;

  id: string = "modal-" + randomID();
  modal: any;
  
  // 0 or 1, depending on how you want to set the style. TODO: Good to settle on
  // one or the other.
  styling = 1;  


  /**
   * Watch for changes to the modelValue property. Show the popup accordingly.
   *
   * @param {boolean} newValue  The new value of the modelValue property.
   */
  @Watch("modelValue")
  onModelValueChange(newValue: boolean) {
    if (newValue) {
      this.modal.show();
    } else {
      this.modal.hide();
    }
  }

  /**
   * Get the classes to add to the popup header.
   * 
   * @returns {string} The classes to add to the popup header.
   */
  get headerClasses(): string {
    let styles = "modal-header ";
    if (this.styling === 0) {
      return styles + 'bg-' + this.variant + ' text-white';
    }
    return styles + 'alert alert-' + this.variant;
  }

  /**
   * Runs when the action button is pressed.
   */
  actionBtn() {
    setTimeout(() => {
      this.$emit("onDone");
      this.$emit("update:modelValue", false);
    }, FORM_INPUT_DELAY_UPDATE_DEFAULT);
  }

  /**
   * Runs when a secondary action button is pressed.
   */
  actionBtn2() {
    setTimeout(() => {
      this.$emit("onDone2");
      this.$emit("update:modelValue", false);
    }, FORM_INPUT_DELAY_UPDATE_DEFAULT);
  }

  /**
   * If enter just pressed, triggers action button press.
   *
   * @param {KeyboardEvent} e  The keyboard event.
   */
  onKeypress(e: KeyboardEvent) {
    if (e.key === "Enter" && this.actionBtnTxt && this.isActionBtnEnabled) {
      this.actionBtn();
    }
  }

  /** mounted function */
  mounted() {
    let modalElem = document.getElementById(this.id) as HTMLElement;
    this.modal = new Modal(modalElem, {});

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modalElem.addEventListener("shown.bs.modal", (_event) => {
      if (this.onShown) {
        this.onShown();
      }
      this.$emit("update:modelValue", true);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modalElem.addEventListener("show.bs.modal", (_event) => {
      if (this.beforeShown) {
        this.beforeShown();
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modalElem.addEventListener("hidden.bs.modal", (_event) => {
      this.$emit("update:modelValue", false);

      // Below fires regardless of how closed. In contrast, onDone fires if
      // click on actionBtn.
      this.$emit("onClosed");
    });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
</style>
