<template>
  <div>
    <div class="tabs">
      <ul>
        <li
          v-for="(tab, index) in tabs"
          :key="index"
          :class="{ 'is-active': tab.isActive }"
        >
          <a @click="selectTab(tab.id)">{{ tab.label }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

export default class Tabs extends Vue {
  @Prop({ required: true }) tabs: object[] | undefined;
  activeTab = "bash";
  @Watch("activeTab") onActiveTabChanged(value: string, oldValue: string) {
    this.$emit("update:activeTab", value);
  }

  /**
   */
  selectTab(id: string) {
    this.activeTab = id;

    this.$emit("update:activeTab", id);
  }
}
</script>

<style scoped>
.tabs {
  margin: 0;
  padding: 0;
  background-color: #0001;
  border-bottom: 1px solid #ccc;
}

.tabs ul {
  margin: 0;
  padding: 0;
}

.tabs ul li {
  list-style: none;
  display: inline-block;
  margin-bottom: -1px;
}

.tabs ul li a {
  text-decoration: none;
  color: #000;
  display: block;
  padding: 10px 15px;
  border-bottom: 1px solid #ccc;
}

.tabs ul li a:hover {
  background: #f4f4f4;
}

.tabs ul li.is-active a {
  background: #fff;
  border-bottom: 1px solid #fff;
}

.tabs-details {
  border: 1px solid #ccc;
  padding: 15px;
}

.tabs-details p {
  margin: 0;
}
</style>
