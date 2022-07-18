<template>
  <input
    type="radio"
    class="btn-check"
    :name="name"
    :id="id"
    autocomplete="off"
    :checked="checked"
    @click="onclick()"
  />
  <label class="btn btn-outline-primary btn-sm" :for="id">
    {{ option }}
  </label>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({
  components: {},
  emits: {onclick}
})
export default class Radio extends Vue {
  @Prop({ required: true }) option!: string;
  @Prop() checked!: boolean;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) id!: string;

  onclick() {
    this.$emit("onclick");
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss"></style>
