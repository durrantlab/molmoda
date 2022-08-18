<template>
  <div class="modal fade" :id="id" tabindex="-1" @keypress="onKeypress">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button
            v-if="cancelXBtn"
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body" style="overflow: hidden;">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <button
            v-if="cancelBtnTxt"
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            {{ cancelBtnTxt }}
          </button>
          <button
            v-if="actionBtnTxt"
            type="button"
            :disabled="!actionBtnEnabled"
            class="btn btn-primary"
            @click="actionBtn"
          >
            {{ actionBtnTxt }}
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

@Options({
  components: {},
})
export default class Popup extends Vue {
  @Prop({ required: true }) modelValue!: any;
  @Prop({ default: "My Title" }) title!: string;
  @Prop() cancelBtnTxt!: string; // If undefined, no cancel button
  @Prop() actionBtnTxt!: string; // If undefined, no ok button
  @Prop({ default: true }) cancelXBtn!: boolean;
  @Prop({ default: true }) actionBtnEnabled!: boolean;
  @Prop({}) onShown!: Function;

  id: string = "modal-" + randomID();
  modal: any;

  @Watch("modelValue")
  onModelValueChange(newValue: boolean) {
    if (newValue) {
      this.modal.show();
    } else {
      this.modal.hide();
    }
  }

  actionBtn() {
    this.$emit("onDone");
    this.$emit("update:modelValue", false);
  }

  onKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.actionBtnTxt && this.actionBtnEnabled) {
      this.actionBtn();
    }
  }

  mounted() {
    let modalElem = document.getElementById(this.id) as HTMLElement;
    this.modal = new Modal(modalElem, {});

    modalElem.addEventListener("shown.bs.modal", (event) => {
      if (this.onShown) {
        this.onShown();
      }
      this.$emit("update:modelValue", true);
    });

    modalElem.addEventListener("hidden.bs.modal", (event) => {
      this.$emit("update:modelValue", false);
    });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
</style>
