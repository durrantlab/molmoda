<template>
  <div>
    <span v-if="tableDataToUse.headers.length > 0" class="table-title">
      {{ caption }}
    </span>
    <slot name="afterHeader"></slot>

    <div class="table-responsive mb-3">
      <table
        :class="
          'table table-striped table-hover table-sm mb-0 pb-0 table-borderless' +
          (allowTextWrap ? '' : ' fixed-table')
        "
      >
        <!-- <caption v-if="caption !== ''" class="pb-0 caption-top" style="font-weight:550; font-size:14px; font-style:italic;">
        {{ caption }} 
        </caption> -->
        <thead style="border-top: 0">
          <!-- class="table-light"> -->
          <tr>
            <th
              v-for="header of tableDataToUse.headers"
              v-bind:key="header.text"
              class="sticky-header"
              :style="
                'font-weight: 550;' +
                (header.width ? 'width:' + header.width + 'px;' : '')
              "
            >
              <Tooltip v-if="header.note !== undefined" :title="header.note">
                {{ header.text }}
              </Tooltip>
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
              {{ getCell(row[header.text]).val }}
              <div
                v-if="showIcon(getCell(row[header.text]), row)"
                class="icon-clickable"
                @click="
                  iconClicked(getCell(row[header.text]).iconClickEmitName, row)
                "
              >
                <font-awesome-icon
                  :icon="getCell(row[header.text]).iconClasses"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
    
<script lang="ts">
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { ITableData, CellValue, ICellValue, IHeader } from "./Types";

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
  @Prop({ default: true }) allowTextWrap!: boolean;

  /**
   * Get the table data to use.
   *
   * @returns {ITableData} The table data to use.
   */
  get tableDataToUse(): ITableData {
    const dataToUse = {
      headers: this.tableData.headers.map(h => h),  // To copy
      rows: [] as { [key: string]: CellValue }[],
    };

    // v-if="showColumn(header, tableDataToUse)"


    for (const row of this.tableData.rows) {
      const newRow: { [key: string]: CellValue } = {};
      for (const header of this.tableData.headers) {
        let rowVal = row[header.text] as CellValue;

        // Convert the val to ICellValue.
        if (typeof rowVal === "string" || typeof rowVal === "number") {
          rowVal = { val: rowVal };
        }

        // If it's a number but not an integer, round it to the precision.
        if (typeof rowVal.val === "number" && rowVal.val % 1 !== 0) {
          // Not an integer
          rowVal.val = rowVal.val.toFixed(this.precision);
        }

        newRow[header.text] = rowVal;
      }
      dataToUse.rows.push(newRow);
    }

    // Identify the columns that should be hidden.
    const headersToHide = this.tableData.headers.filter((header) => {
      return !this.showColumn(header, dataToUse);
    });

    for (const header of headersToHide) {
      // Delete header
      const headerIndex = dataToUse.headers.indexOf(header);
      dataToUse.headers.splice(headerIndex, 1);

      // Delete data from rows too.
      for (const row of dataToUse.rows) {
        delete row[header.text];
      }
    }
    
    return dataToUse;
  }

  getCell(cell: CellValue): ICellValue {
    return cell as ICellValue;
  }

  showIcon(cell: ICellValue, row: { [key: string]: CellValue }): boolean {
    if (cell.iconClasses === undefined) {
      // No icon specified, so nothing to show.
      return false;
    }

    if (cell.iconShowFilterFunc === undefined) {
      // If no filter function defined, always show the icon.
      return true;
    }

    return cell.iconShowFilterFunc(row);
  }

  showColumn(header: IHeader, tableData: ITableData): boolean {
    if (header.showColumnFunc === undefined) {
      // If no filter function defined, always show the column.
      return true;
    }

    return header.showColumnFunc(tableData);

    // (header: IHeader, tableData: ITableData) => boolean
    // return this.tableData.headers.find((h) => h.text === header) !== undefined;
  }

  iconClicked(emitName: string | undefined, row: { [key: string]: CellValue }) {
    this.$emit(emitName as string, row);
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

.icon-clickable,
.icon-clickable * {
  cursor: pointer !important;
}

.fixed-table {
  table-layout: fixed;
}

.fixed-table td,
.fixed-table th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
  
<style lang="scss">
.table-title {
  font-weight: 550;
  font-size: 16px;
}
</style>
