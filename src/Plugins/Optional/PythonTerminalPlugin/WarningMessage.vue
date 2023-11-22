<template>
  <h3>{{ warning }}</h3>
</template>

<script lang="ts">
import { Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

export default class Warning extends Vue {
  @Prop({ required: true }) warning!: string;
  /**
   */
  mounted() {
    setTimeout(() => {
      this.$emit("destroy");
      console.log("destroyed withing WarninGMessage.vue");
    }, 5000);
  }
}
</script>
