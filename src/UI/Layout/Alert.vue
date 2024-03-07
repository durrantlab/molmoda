<template>
    <div :class="classes" style="width: 100%" role="alert">
        <slot></slot>
        <button
            v-if="dismissible"
            type="button"
            class="close"
            data-dismiss="alert"
            aria-label="Close"
        >
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * Alert component
 */
@Options({
    components: {},
})
export default class Alert extends Vue {
    @Prop({ default: "primary" }) type!: string;
    @Prop({ default: "" }) extraClasses!: string;

    // NOTE: Dismissable not working/fully implemented. Would require jQuery.
    @Prop({ default: false }) dismissible!: boolean;

    /**
     * The classes for the alert.
     *
     * @returns {string} The classes for the alert.
     */
    get classes(): string {
        let classes = `alert alert-${this.type}`;
        if (this.extraClasses !== "") classes += ` ${this.extraClasses}`;
        if (this.dismissible) classes += " alert-dismissible fade show";
        return classes;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
