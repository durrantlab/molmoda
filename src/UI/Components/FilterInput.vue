<template>
    <div :class="'input-group input-group-sm mb-' + mb">
        <span class="input-group-text" id="basic-addon1" @click="onIconClick" :style="iconStyle">
            <Icon v-if="currentValue === ''" style="color: #212529" :icon="['fas', 'magnifying-glass']" />
            <Icon v-else style="color: #212529" :icon="['fas', 'xmark']" />
        </span>
        <input type="text" class="form-control" :value="currentValue"
            @input="onInput" @keydown="onKeypress" />
    </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-facing-decorator";
import FormElementDescription from "@/UI/Forms/FormElementDescription.vue";
import Icon from "./Icon.vue";
import { createTrailingEdgeDebounce } from "@/Core/Utils/CoalescedTask";

/**
 * FilterInput component
 */
@Component({
    components: {
        FormElementDescription,
        Icon,
    },
    emits: ["update:modelValue", "onFilter"],
})
export default class FilterInput extends Vue {
    @Prop({ required: true }) list!: any[];
    @Prop({ required: true }) extractTextToFilterFunc!: (item: any) => string;
    @Prop({ default: "3" }) mb!: string;
    // Optional now: when bound (v-model) the component is controlled and the
    // parent owns the text, as before. When omitted, the component is
    // uncontrolled and holds the text internally, so typing never re-renders
    // the parent — only this small component repaints per keystroke.
    @Prop({ default: undefined }) modelValue?: string;
    @Prop({ default: 0 }) debounceMs!: number;

    // Backing text for uncontrolled mode; ignored when modelValue is provided.
    private uncontrolledValue = "";
    private filterDebounce:
        | { invoke: () => void; cancel: () => void }
        | null = null;

    /**
     * @returns {boolean} True if a parent drives the value via v-model.
     */
    get isControlled(): boolean {
        return this.modelValue !== undefined;
    }

    /**
     * The current text, from the prop when controlled or internal state when
     * not. Used everywhere the old code read modelValue directly.
     *
     * @returns {string} The active filter text.
     */
    get currentValue(): string {
        return this.isControlled
            ? (this.modelValue as string)
            : this.uncontrolledValue;
    }

    /**
     * Wires up the debounced filter trigger when a delay is configured. The
     * trailing edge reads this.modelValue at fire time, so it always filters
     * against the latest typed value rather than a captured one.
     */
    created(): void {
        if (this.debounceMs > 0) {
            this.filterDebounce = createTrailingEdgeDebounce(
                () => this.runFilter(),
                this.debounceMs
            );
        }
    }

    /**
     * Cancels any pending trailing filter so it can't fire after teardown.
     */
    beforeUnmount(): void {
        this.filterDebounce?.cancel();
    }

    /**
     * Handles input events. Controlled mode emits upward (the modelValue
     * watcher then filters, as before); uncontrolled mode updates internal
     * state and filters directly, keeping the parent out of the keystroke path.
     *
     * @param {Event} e  The input event.
     */
    onInput(e: Event): void {
        const v = (e.target as HTMLInputElement).value;
        if (this.isControlled) {
            this.$emit("update:modelValue", v);
        } else {
            this.uncontrolledValue = v;
            this.onFilter();
        }
    }

    /**
     * Clears the text in whichever mode is active.
     */
    private clearValue(): void {
        if (this.isControlled) {
            this.$emit("update:modelValue", "");
        } else {
            this.uncontrolledValue = "";
            this.onFilter();
        }
    }

    /**
     * Style for the icon container; pointer cursor once there's text to clear.
     *
     * @returns {string} The inline style.
     */
    get iconStyle(): string {
        let style = "width: 32px; margin: auto; display: inline-block;";
        if (this.currentValue !== "") {
            style += "cursor: pointer;";
        }
        return style;
    }

    /**
     * Clears the filter when the (x) icon is clicked.
     */
    onIconClick() {
        if (this.currentValue !== "") {
            this.clearValue();
        }
    }

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

    /**
     * Clears the filter on Escape.
     *
     * @param {KeyboardEvent} event  The key event.
     */
    onKeypress(event: KeyboardEvent) {
        // Detect escape key
        if (event.key === "Escape") {
            this.clearValue();
        }
    }


    /**
     * Triggers filtering. Debounced when a delay is set so the input echoes
     * immediately and the consumer re-render coalesces into one pass;
     * otherwise runs synchronously as before.
     */
    onFilter(): void {
        if (this.filterDebounce !== null) {
            this.filterDebounce.invoke();
        } else {
            this.runFilter();
        }
    }

    /**
     * Filters the list against the current text and emits the result: null
     * when empty, otherwise the matching subset.
     */
    runFilter(): void {
        const searchStr = this.currentValue.toLowerCase();

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
