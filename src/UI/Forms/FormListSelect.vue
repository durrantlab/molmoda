<template>
    <div class="form-list-select-wrapper">
        <div class="custom-input-group">
            <div class="input-wrapper">
                <FormInput :id="id + '-input'" v-model="textValue" type="text" :placeHolder="placeHolder"
                    :disabled="disabled" :filterFunc="null" :warningFunc="null" :description="undefined"
                    :delayBetweenChangesDetected="delayBetweenChangesDetected" @update:modelValue="handleTextInput"
                    :ariaDescribedBy="id + '-dropdown-button'" />
            </div>
            <button v-if="options && options.length > 0"
                :class="`btn btn-primary dropdown-toggle btn-sm custom-add-button ${disabled ? 'disabled' : ''}`"
                type="button" :id="id + '-dropdown-button'" data-bs-toggle="dropdown" aria-expanded="false"
                :disabled="disabled">
                Add
            </button>
            <ul v-if="options && options.length > 0"
                class="dropdown-menu dropdown-menu-end form-list-select-dropdown-menu"
                :aria-labelledby="id + '-dropdown-button'">
                <li v-for="option in actualOptions" :key="option.val">
                    <a :class="`dropdown-item ${option.disabled ? 'disabled' : ''}`"
                        @click.prevent="handleDropdownItemClick(option)">
                        {{ option.description }}
                    </a>
                </li>
            </ul>
        </div>
        <FormElementDescription :description="description" :warning="currentWarningMessage" :validate="false" />
    </div>
</template>
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { IUserArgOption } from "./FormFull/FormFullInterfaces";
import { formInputDelayUpdate } from "@/Core/GlobalVars";
import FormInput from "./FormInput.vue";
// FormSelect is no longer directly used in the template
// import FormSelect from "./FormSelect.vue";
import FormElementDescription from "./FormElementDescription.vue";

interface ParsedListResult {
    parsedList: string[] | number[];
    isValid: boolean;
}

/**
 * FormListSelect component allows users to input a list of items (text or
 * numbers, with support for numeric ranges) via a text field. Optionally, a
 * dropdown can be provided to append predefined items to the list.
 */
@Options({
    components: {
        FormInput,
        // FormSelect, // No longer used here
        FormElementDescription,
    },
    emits: ["update:modelValue", "onChange"],
})
export default class FormListSelect extends Vue {
    /**
     * The current list value, as an array of strings or numbers. This is the
     * v-model prop.
     * 
     * @type {(string[] | number[])}
     * @required
     */
    @Prop({ required: true }) modelValue!: string[] | number[];

    /**
     * A unique identifier for the form element.
     * 
     * @type {string}
     * @required
     */
    @Prop({ required: true }) id!: string;

    /**
     * Specifies the type of items in the list: 'text' or 'number'. If 'number',
     * the input supports numeric ranges (e.g., "1-5").
     * 
     * @type {('text' | 'number')}
     * @default 'text'
     */
    @Prop({ default: 'text' }) inputType!: 'text' | 'number';

    /**
     * An optional array of predefined options for the dropdown select. Each
     * option can be a string or an IUserArgOption object.
     * 
     * @type {(string | IUserArgOption)[]}
     */
    @Prop({ default: () => [] }) options!: (string | IUserArgOption)[];

    /**
     * A description of the form element, displayed below the input fields.
     *
     * @type {string}
     */
    @Prop({ default: "" }) description!: string;

    /**
     * If true, disables the input fields.
     * 
     * @type {boolean}
     * @default false
     */
    @Prop({ default: false }) disabled!: boolean;

    /**
     * Placeholder text for the text input field.
     *
     * @type {string}
     * @default "Enter items, comma or space separated..."
     */
    @Prop({ default: "Enter items, comma or space separated..." }) placeHolder!: string;

    /**
     * A function that returns a warning message string based on the current
     * list value.
     *
     * @type {Function}
     */
    @Prop({ default: null }) warningFunc!: ((val: string[] | number[]) => string) | null;

    /**
     * A function that validates the current list value.
     *
     * @type {Function}
     */
    @Prop({ default: null }) validateFunc!: ((val: string[] | number[]) => boolean) | null;

    /**
     * Delay in milliseconds after input before triggering change detection for
     * the text input.
     *
     * @type {number}
     * @default formInputDelayUpdate
     */
    @Prop({ default: formInputDelayUpdate }) delayBetweenChangesDetected!: number;

    private textValue = "";
    private isInputValid = true; // Tracks internal parsing validity
    private currentWarningMessage = "";

    /**
     * Lifecycle hook called when the component is created. Initializes
     * `textValue` from `modelValue`.
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
    onModelValueChanged(newValue: string[] | number[]): void {
        const { parsedList: currentParsedValue } = this.parseTextToList(this.textValue);
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
     * Also determines if the entire input string was valid.
     *
     * @param {string} text The text to parse.
     * @returns {ParsedListResult} An object containing the parsed list and a boolean indicating validity.
     */
    private parseTextToList(text: string): ParsedListResult {
        const trimmedText = text.trim();
        let isValid = true;

        if (trimmedText === "") {
            return { parsedList: [], isValid: true };
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
                    } else {
                        isValid = false; // Invalid range or non-numeric parts
                    }
                } else {
                    const num = parseInt(part, 10);
                    if (!isNaN(num)) {
                        numericSet.add(num);
                    } else {
                        isValid = false; // Non-numeric part
                    }
                }
            }
            return { parsedList: Array.from(numericSet).sort((a, b) => a - b), isValid };
        } else { // 'text'
            const stringSet = new Set<string>();
            parts.forEach(part => stringSet.add(part));
            // For text input, parsing itself doesn't really "fail" unless specific rules were added.
            // Assuming any non-empty part is a valid text item.
            return { parsedList: Array.from(stringSet), isValid: true };
        }
    }

    /**
     * Handles input from the text field. Updates `textValue` and emits the parsed list.
     * If parsing is not valid, emits an empty list to signal invalidity to FormFull.
     */
    private handleTextInput(): void {
        // textValue is already updated by v-model on FormInput
        const { parsedList, isValid } = this.parseTextToList(this.textValue);
        this.isInputValid = isValid;

        if (!this.isInputValid) {
            this.$emit("update:modelValue", []); // Emit empty list on parsing error
        } else {
            this.$emit("update:modelValue", parsedList);
        }
        this.$emit("onChange", this.isInputValid ? parsedList : []);
        this.updateWarning();
    }

    /**
     * Computed property for dropdown options, ensuring they are in IUserArgOption format.
     *
     * @returns {IUserArgOption[]} The options for the dropdown menu.
     */
    get actualOptions(): IUserArgOption[] {
        return this.options.map(opt =>
            typeof opt === 'string' ? { description: opt, val: opt, disabled: false } : { ...opt, disabled: opt.disabled === true }
        );
    }

    /**
     * Handles selection from the dropdown. Appends the selected value to
     * `textValue`.
     *
     * @param {IUserArgOption} selectedOption The option selected from the dropdown.
     */
    private handleDropdownItemClick(selectedOption: IUserArgOption): void {
        if (selectedOption.disabled) {
            return;
        }
        const selectedValue = String(selectedOption.val); // Ensure it's a string
        if (this.textValue.trim() === "") {
            this.textValue = selectedValue;
        } else {
            // Check if the value already exists in the text input before appending
            const currentListResult = this.parseTextToList(this.textValue);
            const valueExists = currentListResult.parsedList.some(item => String(item) === selectedValue);
            if (!valueExists) {
                this.textValue += `, ${selectedValue}`;
            }
        }
        this.handleTextInput(); // Process the updated textValue
        // The dropdown will close automatically due to Bootstrap behavior.
    }

    /**
  * Updates the warning message based on the `isInputValid` state and `warningFunc` prop.
     */
    private updateWarning(): void {
        if (!this.isInputValid) {
            this.currentWarningMessage = "Invalid input. Please check list format (e.g., for numbers: 1, 2, 3-5).";
        } else if (this.warningFunc) {
            this.currentWarningMessage = this.warningFunc(this.modelValue);
        } else {
            this.currentWarningMessage = "";
        }
    }
}
</script>

<style scoped lang="scss">
.form-list-select-wrapper {
    display: block;
    width: 100%;
}

.custom-input-group {
    display: flex;
    width: 100%;
    position: relative;
}

.input-wrapper {
    flex: 1;
    min-width: 0;

    // Force the FormInput component to take full width
    :deep(.form-control),
    :deep(input) {
        width: 100% !important;
        border-top-right-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
    }

    // Ensure the entire FormInput component wrapper takes full width
    :deep(.form-group),
    :deep(.input-group),
    :deep(div) {
        width: 100% !important;
        margin-bottom: 0 !important;
    }
}

.custom-add-button {
    flex-shrink: 0;
    border-top-left-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-left: 0;
    margin-left: -1px;
}

/* Styling for the dropdown menu itself to make it scrollable */
.form-list-select-dropdown-menu {
    max-height: 300px;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>