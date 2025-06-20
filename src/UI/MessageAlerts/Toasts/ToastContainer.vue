<template>
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <Toast v-for="toast in toasts" :key="toast.id" :toast="toast" />
    </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import Toast from "./Toast.vue";
import { IToast } from "./ToastInterfaces";
import { toasts } from "./ToastManager";

/**
 * A container component that renders all active toast notifications.
 */
@Options({
    components: {
        Toast,
    },
})
export default class ToastContainer extends Vue {
    /**
     * Provides the reactive list of toasts to the template.
     * 
     * @returns {IToast[]} The list of active toasts.
     */
    get toasts(): IToast[] {
        return toasts;
    }
}
</script>

<style scoped lang="scss">
.toast-container {
    /* Ensure the container is above most content but below modals */
    z-index: 1080;
}
</style>