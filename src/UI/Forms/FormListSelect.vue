<template>
    <span>
        <FormInput :id="id + '-input'" v-model="textValue" type="text" :placeHolder="placeHolder" :disabled="disabled"
            :filterFunc="null" :warningFunc="null" :description="null"
            :delayBetweenChangesDetected="delayBetweenChangesDetected" @update:modelValue="handleTextInput" />
        <FormSelect v-if="options && options.length > 0" :id="id + '-select'" v-model="selectedDropdownOption"
            :options="dropdownOptionsWithPlaceholder" :disabled="disabled" @update:modelValue="handleDropdownSelect"
            class="mt-1" />
        <FormElementDescription :description="description" :warning="currentWarningMessage" :validate="false" />
    </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { IUserArgOption } from "./FormFull/FormFullInterfaces";
import { formInputDelayUpdate } from "@/Core/GlobalVars";
import FormInput from "./FormInput.vue";
import FormSelect from "./FormSelect.vue";
import FormElementDescription from "./FormElementDescription.vue";

const DROPDOWN_PLACEHOLDER_VALUE = "__FORM_LIST_SELECT_PLACEHOLDER__";

/**
 * FormListSelect component allows users to input a list of items (text or
 * numbers, with support for numeric ranges) via a text field. Optionally, a
 * dropdown can be provided to append predefined items to the list.
 */
@Options({
    components: {
        FormInput,
        FormSelect,
        FormElementDescription,
    },
    emits: ["update:modelValue", "onChange"],
})
export default class FormListSelect extends Vue {
    /**
     * The current list value, as an array of strings or numbers.
     * This is the v-model prop.
     * @type {(string[] | number[])}
     * @required
     */
    @Prop({ required: true }) modelValue!: string[] | number[];

    /**
     * A unique identifier for the form element.
     * @type {string}
     * @required
     */
    @Prop({ required: true }) id!: string;

    /**
     * Specifies the type of items in the list: 'text' or 'number'.
     * If 'number', the input supports numeric ranges (e.g., "1-5").
     * @type {('text' | 'number')}
     * @default 'text'
     */
    @Prop({ default: 'text' }) inputType!: 'text' | 'number';

    /**
     * An optional array of predefined options for the dropdown select.
     * Each option can be a string or an IUserArgOption object.
     * @type {(string | IUserArgOption)[]}
     */
    @Prop({ default: () => [] }) options!: (string | IUserArgOption)[];

    /**
     * A description of the form element, displayed below the input fields.
     * @type {string}
     */
    @Prop({ default: "" }) description!: string;

    /**
     * If true, disables the input fields.
     * @type {boolean}
     * @default false
     */
    @Prop({ default: false }) disabled!: boolean;

    /**
     * Placeholder text for the text input field.
     * @type {string}
     * @default "Enter items, comma or space separated..."
     */
    @Prop({ default: "Enter items, comma or space separated..." }) placeHolder!: string;

    /**
     * A function that returns a warning message string based on the current list value.
     * @type {((val: string[] | number[]) => string)}
     */
    @Prop({ default: null }) warningFunc!: ((val: string[] | number[]) => string) | null;

    /**
     * A function that validates the current list value.
     * @type {((val: string[] | number[]) => boolean)}
     */
    @Prop({ default: null }) validateFunc!: ((val: string[] | number[]) => boolean) | null;

    /**
     * Delay in milliseconds after input before triggering change detection for the text input.
     * @type {number}
     * @default formInputDelayUpdate
     */
    @Prop({ default: formInputDelayUpdate }) delayBetweenChangesDetected!: number;

    private textValue = "";
    private selectedDropdownOption: string = DROPDOWN_PLACEHOLDER_VALUE;
    private currentWarningMessage = "";

    /**
     * Lifecycle hook called when the component is created.
     * Initializes `textValue` from `modelValue`.
     */
    created() {
        this.updateTextValueFromModelValue(this.modelValue);
        this.updateWarning();
    }

    /**
     * Watcher for the `modelValue` prop. Updates `textValue` if `modelValue`
     * changes externally.
     *
     * @param {string[] | number[]} newValue The new `modelValue`.
     */
    @Watch("modelValue")
    onModelValueChanged(newValue: string[] | number[]) {
        const currentParsedValue = this.parseTextToList(this.textValue);
        // Avoid feedback loop if the change originated from textValue internal update
        if (JSON.stringify(newValue) !== JSON.stringify(currentParsedValue)) {
            this.updateTextValueFromModelValue(newValue);
        }
        this.updateWarning();
    }

    /**
     * Converts the `modelValue` (list) to a string and updates `textValue`.
     *
     * @param {string[] | number[]} listValue The list value.
     */
    private updateTextValueFromModelValue(listValue: string[] | number[]): void {
        this.textValue = listValue.join(', ');
    }

    /**
     * Parses the text from the input field into a list of strings or numbers.
     *
     * @param {string} text The text to parse.
     * @returns {(string[] | number[])} The parsed list.
     */
    private parseTextToList(text: string): string[] | number[] {
        const trimmedText = text.trim();
        if (trimmedText === "") {
            return [];
        }

        const parts = trimmedText.split(/[\s,]+/).map(s => s.trim()).filter(s => s.length > 0);

        if (this.inputType === 'number') {
            const numericSet = new Set<number>();
            for (const part of parts) {
                if (part.includes("-")) {
                    const [startStr, endStr] = part.split("-");
                    const start = parseInt(startStr, 10);
                    const end = parseInt(endStr, 10);
                    if (!isNaN(start) && !isNaN(end) && start <= end) {
                        for (let i = start; i <= end; i++) {
                            numericSet.add(i);
                        }
                    }
                } else {
                    const num = parseInt(part, 10);
                    if (!isNaN(num)) {
                        numericSet.add(num);
                    }
                }
            }
            return Array.from(numericSet).sort((a, b) => a - b); // This correctly returns number[]
        } else { // 'text'
            const stringSet = new Set<string>();
            parts.forEach(part => stringSet.add(part));
            return Array.from(stringSet); // This correctly returns string[]
        }
    }

    /**
     * Handles input from the text field. Updates `textValue` and emits the parsed list.
     */
    private handleTextInput(): void {
        // textValue is already updated by v-model on FormInput
        const parsedList = this.parseTextToList(this.textValue);
        this.$emit("update:modelValue", parsedList);
        this.$emit("onChange", parsedList);
        this.updateWarning();
    }

    /**
     * Computed property for dropdown options, including a placeholder.
     *
     * @returns {IUserArgOption[]} The options for the FormSelect.
     */
    get dropdownOptionsWithPlaceholder(): IUserArgOption[] {
        const placeholderOption: IUserArgOption = {
            description: "Add from list...",
            val: DROPDOWN_PLACEHOLDER_VALUE,
        };
        const actualOptions = this.options.map(opt =>
            typeof opt === 'string' ? { description: opt, val: opt } : opt
        );
        return [placeholderOption, ...actualOptions];
    }

    /**
     * Handles selection from the dropdown. Appends the selected value to
     * `textValue`.
     *
     * @param {string} selectedValue The value selected from the dropdown.
     */
    private handleDropdownSelect(selectedValue: string): void {
        if (selectedValue && selectedValue !== DROPDOWN_PLACEHOLDER_VALUE) {
            if (this.textValue.trim() === "") {
                this.textValue = selectedValue;
            } else {
                this.textValue += `, ${selectedValue}`;
            }
            this.handleTextInput(); // Process the updated textValue
        }
        // Reset dropdown to placeholder
        this.$nextTick(() => {
            this.selectedDropdownOption = DROPDOWN_PLACEHOLDER_VALUE;
        });
    }

    /**
     * Updates the warning message based on the `warningFunc` prop.
     */
    private updateWarning(): void {
        if (this.warningFunc) {
            this.currentWarningMessage = this.warningFunc(this.modelValue);
        } else {
            this.currentWarningMessage = "";
        }
    }
}
</script>

<style scoped lang="scss">
/* Add any specific styles for FormListSelect here */
</style>