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
  "treeData": [],
  "idToLeaf": {}
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
      parentsMarginLeft: 0,
      openNodeLinkOnNewTab: false
    });
    dom.i2svg();
    this.jQueryTreeObj.find(".tree-item").on("click", (e: Event) => {
      // Get id
      let id = $(e.currentTarget).attr("id");
      console.log(this.$store.state["treeview"]["idToLeaf"][id]);
      // console.log(id);
      // debugger;
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
