<template>
    <Alert
        v-if="descriptionToUse !== '' || $slots.default !== undefined"
        type="light"
        class="lh-2"
        extraClasses="p-0 m-0"
        style="padding: 0; margin: 0; line-height: 1.1em; margin-top: 4px"
    >
        <small>
            <slot></slot>
            <span v-if="$slots.default !== undefined">&nbsp;</span>
            <span
                v-if="descriptionToUse !== ''"
                v-html="descriptionToUse"
            ></span>
        </small>
    </Alert>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Alert from "@/UI/Layout/Alert.vue";
import { Prop, Watch } from "vue-property-decorator";
import { isSentence } from "@/Core/Utils";

/**
 * FormElementDescription component
 */
@Options({
    components: {
        Alert,
    },
})
export default class FormElementDescription extends Vue {
    // NOTE: Prefer description, not the slot, because description is subject to
    // extra validation.
    @Prop({}) description!: string;
    @Prop({ default: "" }) warning!: string;
    @Prop({ default: true }) validate!: boolean;

    /**
     * Validate the description when it changes.
     *
     * @param {string} newVal The new description.
     */
    @Watch("description")
    onDescriptionChanged(newVal: string) {
        if (this.validate && !isSentence(newVal)) {
            const msg =
                "FormElementDescription: description must be a sentence (start with capital letter, end with punctuation): " +
                newVal;
            console.error(msg);
            throw new Error(msg);
        }
    }

    /**
     * The description to use.
     *
     * @returns {string} The description to use.
     */
    get descriptionToUse(): string {
        let desc = this.description;

        if (desc === undefined) desc = "";

        if (this.warning !== "") {
            desc = `${desc} <span class="text-danger">${this.warning}</span>`;
        }
        return desc;
    }

    /**
     * Validate the description when the component is mounted.
     */
    mounted() {
        this.onDescriptionChanged(this.description);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="scss" scoped></style>
