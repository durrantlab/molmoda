<template>
    <span>
        <div
            v-if="showMenu"
            class="p-1 dropdown-menu contextMenu"
            :style="contextMenuStyle"
            @mouseleave="closeMenu"
        >
            <span v-for="option of options" :key="option">
                <hr
                    v-if="option.text === 'separator'"
                    class="m-1 my-half dropdown-divider"
                />
                <a
                    v-else
                    @click="onMenuItemClick(option)"
                    :class="
                        'p-1 py-half dropdown-item' +
                        (option.enabled ? '' : ' disabled')
                    "
                    href="#"
                    >{{ option.text }}</a
                >
            </span>

            <!-- <div class="p-1 py-half dropdown-divider"></div> -->
        </div>
        <div @click.right.prevent="onRightClick">
            <slot></slot>
        </div>
    </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { IContextMenuOption } from "./ContextMenuInterfaces";

// Need below for menu to work. No need to lazy load. Always available.
// import "bootstrap/js/dist/dropdown";
// import "bootstrap/js/dist/collapse";

/**
 * ContextMenu component
 */
@Options({
    components: {},
})
export default class ContextMenu extends Vue {
    @Prop({ required: true }) options!: IContextMenuOption[];

    contextMenuStyle = "";
    showMenu = false;

    /**
     * Runs when user right clicks.
     * 
     * @param {MouseEvent} e  The mouse event.
     */
    onRightClick(e: MouseEvent) {
        // Set position of the context menu
        this.contextMenuStyle = `top: ${e.clientY - 16}px; left: ${
            e.clientX - 16
        }px; z-index: 1000;`;
        this.showMenu = true;

        this.$emit("onMenuItemRightClick", e);

        // // Show the menu
        // contextMenu.classList.add('show');

        // // To make the dropdown visible above other elements, adjust the `z-index`
        // if (contextMenu.classList.contains('show')) {
        //     contextMenu.classList.remove('show');
        // }
    }

    /**
     * Runs when user clicks a menu item.
     * 
     * @param {IContextMenuOption} option  The menu item.
     */
    onMenuItemClick(option: IContextMenuOption) {
        // this.$emit("onMenuItemClick", option);
        option.function();
        this.closeMenu();
    }

    /**
     * Closes the menu.
     */
    closeMenu() {
        this.showMenu = false;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.contextMenu {
    // position: absolute;
    position: fixed;
    transform: translate3d(0, 0, 0);
    will-change: transform;
    display: inline-block;
}

.py-half {
    padding-top: 1px !important;
    padding-bottom: 1px !important;
}

.my-half {
    margin-top: 2px !important;
    margin-bottom: 1px !important;
}
</style>
