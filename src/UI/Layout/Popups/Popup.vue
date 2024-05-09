<template>
    <div
        class="modal fade"
        :id="getId"
        tabindex="-1"
        @keypress="onKeypress"
        data-bs-backdrop="static"
        ref="dialog"
    >
        <div :class="'modal-dialog ' + modalWidthToUse" v-if="modelValue">
            <div class="modal-content">
                <div :class="headerClasses" ref="header">
                    <h5 class="modal-title">{{ titleToUse }}</h5>
                    <button
                        v-if="cancelXBtn && !prohibitCancel"
                        type="button"
                        :class="
                            'btn-close ' +
                            (styling === 0 ? 'btn-close-white' : '')
                        "
                        data-bs-dismiss="modal"
                        aria-label="Close"
                    ></button>
                </div>
                <div class="modal-body" style="overflow: hidden">
                    <slot></slot>
                </div>
                <div class="modal-footer">
                    <button
                        v-if="cancelBtnTxt && !prohibitCancel"
                        type="button"
                        class="btn btn-secondary cancel-btn"
                        data-bs-dismiss="modal"
                        @click="cancelBtn"
                        :disabled="isClosing"
                    >
                        {{ cancelBtnTxt }}
                    </button>
                    <button
                        v-if="actionBtnTxt"
                        type="button"
                        :disabled="!isActionBtnEnabled || isClosing"
                        :class="'btn ' + btn1Class + ' action-btn'"
                        @click="actionBtn"
                    >
                        {{ actionBtnTxt }}
                    </button>
                    <!-- :disabled="!isActionBtnEnabled" -->
                    <button
                        v-if="actionBtnTxt2"
                        type="button"
                        class="btn btn-primary action-btn2"
                        @click="otherActionBtn(2)"
                        :disabled="isClosing"
                    >
                        {{ actionBtnTxt2 }}
                    </button>
                    <button
                        v-if="actionBtnTxt3"
                        type="button"
                        class="btn btn-primary action-btn2"
                        @click="otherActionBtn(3)"
                        :disabled="isClosing"
                    >
                        {{ actionBtnTxt3 }}
                    </button>
                    <button
                        v-if="actionBtnTxt4"
                        type="button"
                        class="btn btn-primary action-btn2"
                        @click="otherActionBtn(4)"
                        :disabled="isClosing"
                    >
                        {{ actionBtnTxt4 }}
                    </button>
                </div>
                <div
                    v-if="footerTxt !== ''"
                    class="modal-footer alert alert-light fs-6 lh-sm"
                    style="display: inline-block"
                    v-html="footerTxt"
                ></div>
                <!-- <small v-html="footerTxt" style="inline-block"></small> -->
            </div>
        </div>
    </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/ban-types */

import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { randomID } from "@/Core/Utils/MiscUtils";
import { PopupVariant } from "./InterfacesAndEnums";
import { dynamicImports } from "@/Core/DynamicImports";
import { formInputDelayUpdate } from "@/Core/GlobalVars";
import { popupClosed, popupOpened } from "./OpenPopupList";
import { capitalizeEachWork } from "@/Core/Utils/StringUtils";

/**
 * Popup component
 */
@Options({
    components: {},
})
export default class Popup extends Vue {
    @Prop({ required: true }) modelValue!: any;
    @Prop({ default: "My Title" }) title!: string;
    @Prop() cancelBtnTxt!: string; // If undefined, no cancel button
    @Prop() actionBtnTxt!: string; // If undefined, no ok button
    @Prop({ default: "" }) actionBtnTxt2!: string; // If undefined, no ok button
    @Prop({ default: "" }) actionBtnTxt3!: string; // If undefined, no ok button
    @Prop({ default: "" }) actionBtnTxt4!: string; // If undefined, no ok button
    @Prop({ default: true }) cancelXBtn!: boolean;
    @Prop({ default: true }) isActionBtnEnabled!: boolean;
    @Prop({ default: false }) prohibitCancel!: boolean;
    @Prop({ default: PopupVariant.Primary }) variant!: PopupVariant;
    @Prop({ required: true }) id!: string;
    @Prop({}) onShown!: Function;
    @Prop({}) onBeforeShown!: Function;
    @Prop({ default: "default" }) modalWidth!: string;
    @Prop({ default: "" }) footerTxt!: string;
    @Prop({ default: true }) submitOnEnter!: boolean;
    @Prop({ default: false }) styleBtn1AsCancel!: boolean;

    // If below is true, you'll still be able to interact with the page behind
    // the modal. I don't think this is currently used, but thought I'd leave it
    // in case it's ever needed.
    @Prop({ default: false }) floating!: boolean;

    idToUse = "";

    modal: any = undefined;

    // 0 or 1, depending on how you want to set the style. TODO: Good to settle on
    // one or the other.
    styling = 1;

    // Allows you to force the modal closed regardless of the modelValue
    // property. Use with caution. Should always restore to true quickly.
    isClosing = false;

    get titleToUse(): string {
        return capitalizeEachWork(this.title);
    }

    /**
     * Watch for changes to the modelValue property. Show the popup accordingly.
     *
     * @param {boolean} newValue  The new value of the modelValue property.
     */
    @Watch("modelValue")
    async onModelValueChange(newValue: boolean) {
        await this.setupModal();
        if (newValue) {
            this.modal.show();
            popupOpened(this.getId);
        } else {
            this.modal.hide();
            popupClosed(this.getId);
        }
        return;
    }

    get btn1Class(): string {
        return this.styleBtn1AsCancel === true
            ? "btn-secondary"
            : "btn-primary";
    }

    /**
     * Gets the width to use on the modal.
     *
     * @returns {string} The width to use on the modal.
     */
    get modalWidthToUse(): string {
        if (this.modalWidth === "default") {
            return "";
        }

        // Require it to be sm, lg, or xl
        if (
            this.modalWidth !== "sm" &&
            this.modalWidth !== "lg" &&
            this.modalWidth !== "xl" &&
            this.modalWidth !== "default"
        ) {
            throw "modalWidth must be default, sm, lg, or xl";
        }

        return "modal-" + this.modalWidth;
    }

    /**
     * Gets the id to use on the modal.
     *
     * @returns {string} The id to use on the modal.
     */
    get getId(): string {
        if (this.idToUse !== "") {
            // Already set, so use it.
            return this.idToUse;
        }

        if (this.id !== "") {
            // Not set, but id set. So use that.
            this.idToUse = this.id;
            return this.idToUse;
        }

        // Nether _idToUse nor id set, so set _idToUse to a random value.
        this.idToUse = "modal-" + randomID();
        return this.idToUse;
    }

    /**
     * Get the classes to add to the popup header.
     *
     * @returns {string} The classes to add to the popup header.
     */
    get headerClasses(): string {
        let styles = "modal-header mb-0";
        if (this.styling === 0) {
            return styles + "bg-" + this.variant + " text-white";
        }
        return styles + "alert alert-" + this.variant;
    }

    /**
     * Runs when the cancel button is pressed.
     */
    cancelBtn() {
        setTimeout(() => {
            this.$emit("onCancel");
            this.$emit("update:modelValue", false);
        }, formInputDelayUpdate);
    }

    /**
     * Runs when the action button is pressed.
     */
    actionBtn() {
        // This gets it to close immediately.
        this.isClosing = true;

        setTimeout(() => {
            // This because you need to wait for user inputs to be finalized.
            this.$emit("onDone");
            this.$emit("update:modelValue", false);
            this.isClosing = false;
        }, formInputDelayUpdate);
    }

    /**
     * Runs when a secondary action button is pressed.
     *
     * @param {number} idx  The number of the other action button that was
     *                      pressed.
     */
    otherActionBtn(idx: number) {
        setTimeout(() => {
            this.$emit("onDone" + idx.toString());
            // this.$emit("update:modelValue", false);
        }, formInputDelayUpdate);
    }

    /**
     * If enter just pressed, triggers action button press.
     *
     * @param {KeyboardEvent} e  The keyboard event.
     */
    onKeypress(e: KeyboardEvent) {
        if (e.key === "Enter" && this.submitOnEnter) {
            if (this.actionBtnTxt && this.isActionBtnEnabled) {
                this.actionBtn();
            } else if (!this.actionBtnTxt) {
                // Close modal (assuming only cancel button available).
                this.$emit("update:modelValue", false);
            }
        }
    }

    /**
     * Sets up the modal. Dynamic imports, etc.
     *
     * @returns {Promise<any>}  A promise that resolves the modal when it is set
     *     up.
     */
    async setupModal(): Promise<any> {
        // Dynamic import of bootstrap modal.
        if (this.modal !== undefined) {
            return this.modal;
        }

        const Modal = await dynamicImports.bootstrapModal.module;
        let modalElem = document.getElementById(this.getId) as HTMLElement;

        this.modal = new Modal(modalElem, {});

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        modalElem.addEventListener("shown.bs.modal", (_event) => {
            this.onModalShown();
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        modalElem.addEventListener("show.bs.modal", (_event) => {
            if (this.onBeforeShown) {
                this.onBeforeShown();
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        modalElem.addEventListener("hidden.bs.modal", (_event) => {
            this.$emit("update:modelValue", false);

            // Below fires regardless of how closed. In contrast, onDone fires if
            // click on actionBtn.
            this.$emit("onClosed");
        });

        // Implemented ability to close modal with escape (controllable).
        modalElem.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape" && this.prohibitCancel) {
                    event.stopPropagation(); // Prevents the modal from closing
                }
            },
            true
        );

        return this.modal;
    }

    /**
     * Runs when the modal is shown.
     */
    onModalShown() {
        this.makeDraggable();
        this.$nextTick(() => {
            if (this.floating) {
                const dialog = this.$refs.dialog as HTMLElement;
                dialog.style.pointerEvents = "none";
                (
                    document.querySelector(".modal-backdrop") as HTMLElement
                ).style.display = "none";

                // Below if you ever need to restore, for reference:
                // this.$refs.modal.style.pointerEvents = "auto";
                // this.$refs.modal.querySelector(
                //     ".modal-backdrop"
                // ).style.display = "block";
            }
        });
        if (this.onShown) {
            this.onShown();
        }
        this.$emit("update:modelValue", true);
    }

    /**
     * Makes the dialog draggable.
     */
    makeDraggable() {
        const dialog = this.$refs.dialog as HTMLElement;
        const header = this.$refs.header as HTMLElement;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialX = 0;
        let initialY = 0;

        header.addEventListener("mousedown", (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = dialog.offsetLeft;
            initialY = dialog.offsetTop;

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            dialog.style.left = initialX + dx + "px";
            dialog.style.top = initialY + dy + "px";
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            // If dialog is up against the top, move it down a bit.
            if (dialog.offsetTop < 0) {
                dialog.style.top = "0px";
            }
        };
    }

    /** mounted function */
    // mounted() {}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.modal-header {
    /* Cursor shows a grabbable hand icon when hovering */
    cursor: grab;
}

.modal-header:active {
    /* Cursor changes to a grabbing hand icon when the header is clicked and
    held */
    cursor: grabbing;
}
</style>
