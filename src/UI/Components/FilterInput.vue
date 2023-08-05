<template>
    <div :class="'input-group input-group-sm mb-' + mb">
        <span class="input-group-text" id="basic-addon1">
            <font-awesome-icon
                style="color: #212529"
                :icon="['fas', 'magnifying-glass']"
            />
        </span>

        <input type="text" class="form-control" v-model="filterStr" />
        <!-- <button class="btn btn-link" type="button">
            <font-awesome-icon
                style="color: #212529"
                :icon="['far', 'rectangle-xmark']"
            />
        </button> -->
    </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";

/**
 * FilterInput component
 */
@Options({
    components: {
        FormElementDescription,
    },
})
export default class FilterInput extends Vue {
    @Prop({ required: true }) list!: any[];
    @Prop({ required: true }) extractTextToFilterFunc!: (item: any) => string;
    @Prop({ default: "3" }) mb!: string;

    // @Prop({ required: true }) modelValue!: any;
    // @Prop({ default: "placeholder" }) placeHolder!: string;

    filterStr = "";

    @Watch("filterStr")
    onFilterStrChange() {
        this.onFilter();
    }

    @Watch("list")
    onListChange() {
        this.onFilter();
    }

    onFilter() {
        const searchStr = this.filterStr.toLowerCase();

        if (searchStr === "") {
            // No search term, so emit null.
            this.$emit("onFilter", null);
            return;
        }

        // Get text to filter for each item in the list
        const textToFilter = this.list.map((item) =>
            this.extractTextToFilterFunc(item).toLowerCase()
        );

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
