<template>
    <div :class="cls">
        <label
            v-if="label !== ''"
            :for="randomID"
            :class="'form-label mb-0' + (disabled ? ' disabled-txt' : '') + (useSubLabelFormatting ? ' fst-italic fw-light' : '')"
        >
            <small v-if="smallLabel">{{ label }}</small>
            <span v-else>{{ label }}</span>
        </label>
        <div :id="randomID" :aria-label="label" :title="label">
            <slot></slot>
        </div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

/**
 * FormWrapper component
 */
@Options({
    components: {},
})
export default class FormWrapper extends Vue {
    @Prop({ default: "" }) label!: string;
    @Prop({ default: false }) smallLabel!: boolean;
    @Prop({ default: "mb-2" }) cls!: string;
    @Prop({ default: false }) disabled!: boolean;
    @Prop({ default: false }) useSubLabelFormatting!: boolean;

    randomID = "";

    // /**
    //  * Get a random ID.
    //  *
    //  * @returns {string} The random ID.
    //  */
    // get randomID(): string {
    //     return 
    // }

    mounted() {
        this.randomID = (
            "a" +
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.disabled-txt {
    opacity: 0.5;
}

</style>
