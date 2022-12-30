<template>
  <div class="accordion-item" :id="id">
    <h2 class="accordion-header" :id="'heading-' + id">
      <button
        :class="'accordion-button bg-primary text-white p-2' + (show ? '' : ' collapsed')"
        type="button"
        data-bs-toggle="collapse"
        :data-bs-target="'#collapse-' + id"
        :aria-expanded="show"
        :aria-controls="'collapse-' + id"
      >
        {{title}}
      </button>
    </h2>
    <div
      :id="'collapse-' + id"
      :class="'accordion-collapse collapse' + (show ? ' show' : '')"
      :aria-labelledby="'heading-' + id"
      :data-bs-parent="'#' + id"
    >
      <div class="accordion-body p-2 pt-0">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * AccordianItem component
 */
@Options({
  components: {},
})
export default class AccordianItem extends Vue {
  @Prop({ default: "" }) id!: string;
  @Prop({ default: "Title" }) title!: string;
  @Prop({ default: false }) showInitially!: boolean;

  show = false;

  /** mounted function */
  mounted() {
    this.show = this.showInitially;
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">

// .accordion-header {
//   background-color: $primary;
// }
// .accordion-button {
//   color: $white;
// }

.accordion-button {
  color: white !important;
}
.accordion-button.collapsed::after {
  // Make it white
  background-image: url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27%23ffffff%27%3e%3cpath fill-rule=%27evenodd%27 d=%27M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z%27/%3e%3c/svg%3e")
}

.accordion-button:not(.collapsed)::after {
  // Make it white
  background-image: url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27%23ffffff%27%3e%3cpath fill-rule=%27evenodd%27 d=%27M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z%27/%3e%3c/svg%3e")
}

.accordion-button:focus {
  // I don't like the shadow bootstrap puts on the button when it's focused
  box-shadow: none;
}

</style>
