<!-- <link rel="stylesheet" href="dist/sl-vue-tree-dark.css">
<script src="dist/sl-vue-tree.js"></script> -->

<template>
  <span id="treeContainer" ref="treeContainer">
    <div id="tree" ref="tree"></div>
  </span>
</template>

<script lang="ts">
/* eslint-disable */

import "@/libs/bs5treeview/src/js/bstreeview";
import { dom } from "@fortawesome/fontawesome-svg-core";
import { addVueXStoreModule } from "@/Store";

import { Options, Vue } from "vue-class-component";
import { Watch } from 'vue-property-decorator';

// import "bootstrap/js/dist/dropdown";
// import "bootstrap/js/dist/collapse";

declare var $: any;

console.log("treeview");

addVueXStoreModule("treeview", {
  "treeData": [
    {
      text: "Node 1",
      icon: "fa-regular fa-folder",
      class: "tree-item",
      nodes: [
        {
          text: "Sub Node 1",
          icon: "fa-regular fa-file",
          class: "tree-item",
          nodes: [
            {
              id: "sub-node-1",
              text: "Sub Child Node 1",
              icon: "fa fa-folder",
              class: "nav-level-3",
              href: "https://google.com",
            },
            {
              text: "Sub Child Node 2",
              icon: "fa fa-folder",
            },
          ],
        },
        {
          text: "Sub Node 2",
          icon: "fa fa-folder",
        },
      ],
    },
    {
      text: "Node 2",
      icon: "fa fa-folder",
    },
    {
      text: "Node 3",
      icon: "fa fa-folder",
    },
    {
      text: "Node 4",
      icon: "fa fa-folder",
    },
    {
      text: "Node 5bd_",
      icon: "fa fa-folder",
    },
  ],
});

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

  @Watch('treeData', { deep: true })
  onTreeDataChanged(val: any, oldVal: any) {
    this.loadData();
  }

  loadData() {
    // clear DOM (because bstreeview has no reload feature:
    // https://github.com/chniter/bstreeview/issues/24)
    if (this.jQueryTreeObj) {
      this.jQueryTreeObj.remove();
    }
    this.jQueryTreeObj = $('<div></div>');
    this.jQueryContainerObj.append(this.jQueryTreeObj);
    this.jQueryTreeObj.bstreeview({ 
      data: this.treeData,
      // Below handled through custom css instead
      indent: 0,
      parentsMarginLeft: 0
    });
    dom.i2svg();
  }

  mounted() {
    this.jQueryContainerObj = $(this.$refs.treeContainer as HTMLElement);
    this.loadData();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.tree-item .item-icon, .tree-group .item-icon {
  margin-right: 5px !important;
}
.tree-item, .tree-group {
  white-space: nowrap;
}
.tree-item {
  margin-left: 14px;
}
.list-group {
  margin-left: 14px;
}
</style>
