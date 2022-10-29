<template>
  <div>
    <span
      v-if="tableDataToUse.headers.length > 0"
      style="font-weight: 550; font-size: 16px"
      >{{ caption }}</span
    >

    <div class="table-responsive mb-3">
      <table class="table table-striped table-hover table-sm mb-0 pb-0 table-borderless">
        <!-- <caption v-if="caption !== ''" class="pb-0 caption-top" style="font-weight:550; font-size:14px; font-style:italic;">
        {{
          caption
        }} -->
        <!-- </caption> -->
        <thead style="border-top: 0">
          <!-- class="table-light"> -->
          <tr>
            <th
              v-for="header of tableDataToUse.headers"
              v-bind:key="header.text"
              class="sticky-header"
              style="font-weight: 550"
            >
              <Tooltip v-if="header.note !== undefined" :title="header.note">{{
                header.text
              }}</Tooltip>
              <span v-else>{{ header.text }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) of tableDataToUse.rows" v-bind:key="idx">
            <td
              v-for="header of tableDataToUse.headers"
              v-bind:key="header.text"
            >
              {{ row[header.text] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
    
<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Tooltip from "../MessageAlerts/Tooltip.vue";

interface IHeader {
  text: string;
  note?: string;
}
export interface ITableData {
  headers: IHeader[];
  rows: { [key: string]: any[] }[];
}

/**
 * Table component
 */
@Options({
  components: {
    Tooltip,
  },
})
export default class Table extends Vue {
  @Prop({ default: { headers: [], rows: [] } }) tableData!: ITableData;
  @Prop({ default: 2 }) precision!: number;
  @Prop({ default: "" }) caption!: string;

  /**
   * Get the table data to use.
   * 
   * @returns {ITableData} The table data to use.
   */
  get tableDataToUse(): ITableData {
    const dataToUse = {
      headers: this.tableData.headers,
      rows: [] as { [key: string]: any }[],
    };
    for (const row of this.tableData.rows) {
      const newRow: { [key: string]: any } = {};
      for (const header of this.tableData.headers) {
        let val = row[header.text] as any;
        if (typeof val === "number" && val % 1 !== 0) {
          // Not an integer
          val = val.toFixed(this.precision);
        }
        newRow[header.text] = val;
      }
      dataToUse.rows.push(newRow);
    }

    return dataToUse;
  }
}
</script>
    
  <!-- Add "scoped" attribute to limit CSS to this component only -->
  <style scoped lang="scss">
.sticky-header {
  position: sticky;
  top: 0;
}

caption {
  padding-top: 0.15rem;
}

table {
  font-size: 14px;
}
</style>
  