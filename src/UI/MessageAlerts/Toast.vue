<template>
  <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
    <div
      id="liveToast"
      class="toast hide"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="toast-header">
        <!-- <img src="..." class="rounded me-2" alt="..." /> -->
        <strong class="me-auto">{{title}}</strong>
        <small v-if="subtitle">{{subtitle}}</small>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="toast"
          aria-label="Close"
        ></button>
      </div>
      <div class="toast-body">{{message}}</div>
    </div>
  </div>
</template>

<script lang="ts">

import { randomID } from "@/Core/Utils";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Toast from "bootstrap/js/dist/toast";

@Options({
  components: {},
})
export default class Menu extends Vue {
  @Prop({ required: true }) title!: string;
  @Prop({ default: undefined }) subtitle!: string;
  @Prop({ required: true }) message!: string;

  id: string = "toast-" + randomID();
  toast: any;

  @Watch("modelValue")
  onModelValueChange(newValue: boolean) {
    if (newValue) {
      this.toast.show();
    } else {
      this.toast.hide();
    }
  }

  mounted() {
    let toastElem = document.getElementById(this.id) as HTMLElement;
    this.toast = new Toast(toastElem, {});

    toastElem.addEventListener("shown.bs.toast", (event) => {
      this.$emit("update:modelValue", true);
    });

    toastElem.addEventListener("hidden.bs.toast", (event) => {
      this.$emit("update:modelValue", false);
    });
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

