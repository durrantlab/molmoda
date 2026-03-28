import { PluginParentClass } from "@/Plugins/Parents/PluginParentClass/PluginParentClass";

/**
 * Registers click and Enter-key listeners that invoke a copy callback,
 * then self-remove. Used by CopyPlugin and CopyAsSmilesPlugin to avoid
 * duplicating the same DOM-wiring boilerplate.
 *
 * @param {PluginParentClass} plugin  The plugin instance (provides pluginId).
 * @param {() => void}        copyFn  The function to call on click / Enter.
 */
export function registerClipboardListeners(
    plugin: PluginParentClass,
    copyFn: () => void
): void {
    const btnSelector = `#modal-${plugin.pluginId} .action-btn`;
    const btn = document.querySelector(btnSelector);

    const onBtnClick = () => {
        copyFn();
        btn?.removeEventListener("click", onBtnClick);
    };
    btn?.addEventListener("click", onBtnClick);

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            copyFn();
            document.removeEventListener("keydown", onKeydown);
        }
    };
    document.addEventListener("keydown", onKeydown);
}