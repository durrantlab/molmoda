<template>
    <div :class="'input-group input-group-sm mb-' + mb">
        <span class="input-group-text" id="basic-addon1">
            <Icon
                style="color: #212529;"
                :icon="['fas', 'magnifying-glass']"
            />
        </span>

        <input
            type="text"
            class="form-control"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            @keydown="onKeypress"
        />
    </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import Icon from "./Icon.vue";

/**
 * FilterInput component
 */
@Options({
    components: {
        FormElementDescription,
        Icon
    },
})
export default class FilterInput extends Vue {
    @Prop({ required: true }) list!: any[];
    @Prop({ required: true }) extractTextToFilterFunc!: (item: any) => string;
    @Prop({ default: "3" }) mb!: string;
    @Prop({ required: true }) modelValue!: string; // filterStr
    // @Prop({ default: "placeholder" }) placeHolder!: string;

    /**
     * When the filter string changes, trigger onFilter.
     *
     * @param {string} newVal  The new value of the filter string.
     */
    @Watch("modelValue")
    onModelValueChange(newVal: string) {
        this.$emit("update:modelValue", newVal);
        this.onFilter();
    }

    /**
     * When the list changes, trigger onFilter.
     */
    @Watch("list")
    onListChange() {
        this.onFilter();
    }

    onKeypress(event: KeyboardEvent) {
        // Detect escape key
        if (event.key === "Escape") {
            this.$emit("update:modelValue", "");
            this.onFilter();
        }
    }


    /**
     * Filter the list per the filter text and emit the filtered list.
     */
    onFilter() {
        const searchStr = this.modelValue.toLowerCase();

        if (searchStr === "") {
            // No search term, so emit null.
            this.$emit("onFilter", null);
            return;
        }

        // Get text to filter for each item in the list
        const textToFilter = this.list.map((item) => {
            let textToFilter = this.extractTextToFilterFunc(item);
            if (textToFilter === undefined) textToFilter = "";
            return textToFilter.toLowerCase();
        });

        // Get indexes of items that match the search string
        const idxs = textToFilter
            .map((text, idx) => (text.includes(searchStr) ? idx : -1))
            .filter((idx) => idx !== -1);

        // Get the items that match the search string
        const filteredItems = idxs.map((idx) => this.list[idx]);

        this.$emit("onFilter", filteredItems);
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
input:focus {
    outline: none !important;
    box-shadow: none !important;
}
</style>
