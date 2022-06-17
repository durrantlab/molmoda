<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <span id="treeContainer" ref="treeContainer">
    <div id="tree" ref="tree"></div>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import "@/libs/bs5treeview/bstreeview.jdd";
import { dom } from "@fortawesome/fontawesome-svg-core";
import { addVueXStoreModule } from "@/Store";

import { Options, Vue } from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { getAllNodes, getNodeOfId } from "./TreeUtils";

// import "bootstrap/js/dist/dropdown";
// import "bootstrap/js/dist/collapse";

declare var $: any;

addVueXStoreModule("treeview", {
  treeData: [],
});

interface IDOMTreeViewItem {
  id: string;
  header: any;
  body: any;
  collapsed: boolean;
}

@Options({
  props: {
    menuData: Object,
  },
  components: {},
})
export default class TreeView extends Vue {
  //   menuData!: IMenuAction | IMenuSubmenu;

  jQueryTreeObj: any;
  jQueryContainerObj: any;

  get treeData(): any {
    return this.$store.state["treeview"]["treeData"];
  }

  @Watch("treeData", { deep: true })
  onTreeDataChanged(val: any, oldVal: any) {
    this.loadData();
  }

  private getDOMItems(): IDOMTreeViewItem[] {
    const results: IDOMTreeViewItem[] = [];
    for (const node of getAllNodes(this.treeData)) {
      const id = node.id as string;
      const header = this.jQueryTreeObj.find(`#${id}`);
      const body = header.next(".list-group");
      const collapsed = !body.hasClass("show");
      results.push({
        id,
        collapsed,
        header,
        body,
      });
    }
    return results;
  }

  private restoreCollapsedStates(domItems: IDOMTreeViewItem[]): void {
    for (const domItem of domItems) {
      if (!domItem.collapsed) {
        this.jQueryTreeObj
          .find(`#${domItem.id}`)
          .next(".list-group")
          .addClass("show");
      }
    }
  }

  // private addTreeButtons(domItems: IDOMTreeViewItem[]): void {
  //   // console.log(domItems);
  //   // debugger;
  //   for (const domItem of domItems) {
  //     const header = domItem.header;
  //     header.append("moose");
  //     // if (header.html()) {
  //     // }
  //   }
  // }

  loadData() {
    let domItems: any[] = [];
    if (this.jQueryTreeObj) {
      domItems = this.getDOMItems();

      // clear DOM (because bstreeview has no reload feature:
      // https://github.com/chniter/bstreeview/issues/24)
      this.jQueryTreeObj.remove();
    }

    // (Re)create tree
    this.jQueryTreeObj = $("<div></div>");
    this.jQueryContainerObj.append(this.jQueryTreeObj);
    this.jQueryTreeObj.bstreeview({
      data: this.treeData,
      // Below handled through custom css instead
      indent: 0,
      parentsMarginLeft: 0,
      openNodeLinkOnNewTab: false,
    });

    // Reload icons
    dom.i2svg();

    // Restore collapsed states
    if (domItems.length > 0 && domItems[0].header.length > 0) {
      this.restoreCollapsedStates(domItems);
    } else {
      // Didn't get dom items previously
      // domItems = this.getDOMItems();
    }
    // console.log("domItems", domItems);

    // setTimeout(() => {
    //   this.addTreeButtons(domItems);
    //   alert("domItems");
    // });

    // Make items clickable
    this.jQueryTreeObj.find(".tree-item").on("click", (e: Event) => {
      let id = $(e.currentTarget).attr("id");
      let node = getNodeOfId(id, this.$store.state["treeview"]["treeData"]);
      if (node) {
        node.styles = [
          {
            selection: {},
            style: {
              line: {
                color: "red",
              },
            },
          },
        ];
      }
    });
  }

  mounted() {
    this.jQueryContainerObj = $(this.$refs.treeContainer as HTMLElement);
    this.loadData();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.tree-item .item-icon,
.tree-group .item-icon {
  margin-right: 5px !important;
}
// .tree-item,
// .tree-group {
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
// }
.tree-item {
  margin-left: 14px;
}
.list-group {
  margin-left: 14px;
}
// #molecules .tree-cntnr {
//   background-color:red;
// }
// #molecules .tree-flx-cntnr {
//   display: flex;
// }
// #molecules .tree-btn, #molecules .tree-title {
//   background-color:red;
//   flex: flex-grow;
// }

#molecules .list-group-item {
  display: flex;
}

#molecules .list-group-item .tree-title,
#molecules .list-group-item .tree-btn {
  flex: auto;
  margin-top:-4px;
}

#molecules .list-group-item .tree-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

#molecules .list-group-item .state-icon {
  flex: 0;
  max-width: 8px;
  min-width: 8px;
}

#molecules .list-group-item .item-icon {
  flex: 0;
  max-width: 25px;
  min-width: 25px;
  margin-right: 0px !important;
}

#molecules .list-group-item .state-icon {
  flex: 0;
  max-width: 8px;
  min-width: 8px;
}

#molecules .list-group-item .tree-btn {
  max-width: 35px;
  min-width: 35px;
}

</style>
