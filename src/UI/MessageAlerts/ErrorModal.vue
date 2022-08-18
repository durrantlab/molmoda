<template>
  <Popup
    title="Error"
    v-model="open"
    cancelBtnTxt="Ok"
  >
    <p style="overflow: hidden; text-overflow: ellipsis;">{{ message }}</p>
  </Popup>
    <!-- actionBtnTxt="Load" -->
    <!-- @onDone="onDone" -->
    <!-- :actionBtnEnabled="isBtnEnabled" -->
    <!-- :onShown="onPopupShown" -->
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import Popup from "@/UI/Layout/Popups/Popup.vue";

@Options({
  components: {
    Popup
  },
})
export default class ErrorModal extends Vue {
  // @Prop({ required: true }) title!: string;
  @Prop({ required: true }) message!: string;

  @Watch("message")
  onMessageChange(newValue: string) {
    if (newValue !== "") {
      this.open = true;
    } else {
      this.open = false;
    }
  }

  open = false;
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

