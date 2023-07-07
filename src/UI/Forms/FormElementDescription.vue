<template>
    <Alert
        type="light"
        class="lh-2"
        style="padding: 0; margin: 0; line-height: 1.1em; margin-top: 4px"
    >
        <small>
            <slot></slot>
            <span v-if="description !== undefined" v-html="description"></span>
        </small>
    </Alert>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Alert from "@/UI/Layout/Alert.vue";
import { Prop, Watch } from "vue-property-decorator";
import { isSentence } from "@/Core/Utils";

@Options({
    components: {
        Alert,
    },
})
export default class FormElementDescription extends Vue {
    // NOTE: Prefer description, not the slot, because description is subject to
    // extra validation.
    @Prop({}) description!: string;

    @Watch("description")
    onDescriptionChanged(newVal: string) {
        if (!isSentence(newVal)) {
            const msg =
                "FormElementDescription: description must be a sentence (start with capital letter, end with punctuation): " +
                newVal;
            console.error(msg);
            throw new Error(msg);
        }
    }

    mounted() {
        this.onDescriptionChanged(this.description);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->

<style lang="scss" scoped></style>
