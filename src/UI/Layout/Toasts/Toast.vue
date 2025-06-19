<template>
    <div ref="toastEl" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div :class="['toast-header', `bg-${toast.variant}`, headerTextColorClass]">
            <strong class="me-auto">{{ toast.title }}</strong>
            <small>{{ toast.timestamp }}</small>
            <button v-if="toast.showCloseBtn !== false" type="button" class="btn-close" :class="closeButtonClass"
                data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body" v-html="toast.message"></div>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { IToast } from "./ToastInterfaces";
import { removeToast } from "./ToastManager";
import { dynamicImports } from "@/Core/DynamicImports";
import { PopupVariant } from "../Popups/InterfacesAndEnums";

/**
 * A component representing a single Bootstrap toast notification.
 * It manages its own lifecycle, including showing and hiding itself,
 * and removing itself from the global state upon dismissal.
 */
@Options({})
export default class Toast extends Vue {
    @Prop({ required: true })
    toast!: IToast;

    private toastInstance: any = null;
    private onHiddenCallback: (() => void) | null = null;
    /**
     * Determines the appropriate text color class for the header.
     * 
     * @returns {string} The CSS class for the text color.
     */
    get headerTextColorClass(): string {
        const darkBgVariants = [
            PopupVariant.Primary,
            PopupVariant.Secondary,
            PopupVariant.Success,
            PopupVariant.Danger,
            PopupVariant.Info,
            PopupVariant.Dark,
        ];
        return darkBgVariants.includes(this.toast.variant) ? 'text-white' : 'text-dark';
    }

    /**
     * Determines the appropriate class for the close button based on the toast variant.
     * @returns {string} The class string for the close button.
     */
    get closeButtonClass(): string {
        return this.headerTextColorClass === 'text-white' ? 'btn-close-white' : '';
    }

    /**
     * Lifecycle hook called when the component is mounted.
     * Initializes and shows the Bootstrap toast.
     */
    async mounted() {
        try {
            const Toast = await dynamicImports.bootstrapToast.module;
            const toastEl = this.$refs.toastEl as HTMLElement;

            if (toastEl) {
                // If duration is explicitly 0 or negative, don't autohide.
                // Otherwise (duration > 0 or undefined), do autohide.
                const autohide = !(
                    this.toast.duration !== undefined && this.toast.duration <= 0
                );
                const toastOptions: { autohide: boolean; delay?: number } = {
                    autohide: autohide,
                };
                // Only set the delay if autohide is true.
                if (autohide) {
                    // If duration is a positive number, use it. Otherwise, use the default of 5000.
                    toastOptions.delay =
                        this.toast.duration && this.toast.duration > 0
                            ? this.toast.duration
                            : 5000;
                }
                this.toastInstance = new Toast(toastEl, toastOptions);
                this.onHiddenCallback = () => {
                    if (this.toast.callBack) {
                        this.toast.callBack();
                    }
     // Defer removal to prevent race condition where Vue removes the element
     // before Bootstrap's hide transition logic is fully complete.
     setTimeout(() => {
                    removeToast(this.toast.id);
     }, 0);
                };
                // When the toast is hidden by Bootstrap, remove it from our manager
                toastEl.addEventListener("hidden.bs.toast", this.onHiddenCallback);
                this.toastInstance.show();
            }
        } catch (error) {
            console.error("Failed to initialize Bootstrap toast:", error);
        }
    }

    /**
     * Lifecycle hook called before the component is unmounted.
     * Disposes of the Bootstrap toast instance to prevent memory leaks.
     */
    beforeUnmount() {
        if (this.toastInstance) {
            // Prevent the hidden event from firing during disposal
            const toastEl = this.$refs.toastEl as HTMLElement;
            if (toastEl && this.onHiddenCallback) {
                toastEl.removeEventListener("hidden.bs.toast", this.onHiddenCallback);
            }
            this.toastInstance.dispose();
        }
    }
}
</script>

<style scoped lang="scss">
.toast {
    // Ensure toasts have a higher z-index to appear over content
    z-index: 1100;
    // Override Bootstrap's default translucent background for an opaque look
    --bs-toast-bg: var(--bs-body-bg, #fff);
    background-color: var(--bs-toast-bg);
    // Add transition for smooth appearance/disappearance
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-header {
    // Ensure the header background is also opaque
    --bs-toast-header-bg: var(--bs-body-bg, #fff);
    background-color: var(--bs-toast-header-bg);
}

// Make sure the background color utility classes are fully opaque
.toast-header.bg-primary,
.toast-header.bg-secondary,
.toast-header.bg-success,
.toast-header.bg-danger,
.toast-header.bg-warning,
.toast-header.bg-info,
.toast-header.bg-light,
.toast-header.bg-dark {
    --bs-bg-opacity: 1;
}
</style>