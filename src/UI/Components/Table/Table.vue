<template>
  <div style="border: 1px solid #dfe2e6" class="mb-3">
    <span v-if="tableDataToUse.headers.length > 0" class="table-title ps-1">
      {{ caption }}
    </span>
    <slot name="afterHeader"></slot>

    <div class="table-responsive">
      <!--  -->
      <table
        :class="
          'table table-striped table-hover table-sm mb-0 pb-0 table-borderless' +
          (allowTextWrap ? '' : ' fixed-table')
        "
      >
        <!-- style="border-top: 1px solid #dfe2e6;" -->
        <!-- <caption v-if="caption !== ''" class="pb-0 caption-top" style="font-weight:550; font-size:14px; font-style:italic;">
        {{ caption }} 
        </caption> -->
        <thead style="border-top: 0">
          <!-- class="table-light"> -->
          <tr>
            <th
              v-for="header of tableDataToUse.headers"
              v-bind:key="header.text"
              class="sticky-header pe-3"
              :style="
                'font-weight: 550; white-space: nowrap;' +
                (header.width ? 'width:' + header.width + 'px;' : '') +
                (isHeaderSortable(header) ? 'cursor: pointer;' : '')
              "
              @click="headerClick(header)"
            >
              <span v-if="isHeaderSortable(header)">
                <font-awesome-icon
                  style="color: #212529"
                  :icon="['fa', headerIcon(header)]"
                />&nbsp;
              </span>
              <Tooltip v-if="header.note !== undefined" :tip="header.note">
                {{ header.text }}
              </Tooltip>
              <span v-else>{{ header.text }}</span>
            </th>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td :colspan="tableData.headers.length">
              Download as <a @click.prevent="download('csv')" href="#">CSV</a>,
              <a @click.prevent="download('xlsx')" href="#">XLSX</a>, or
              <a @click.prevent="download('json')" href="#">JSON</a>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr v-for="(row, rowIdx) of tableDataToUse.rows" v-bind:key="rowIdx">
            <td
              v-for="header of tableDataToUse.headers"
              v-bind:key="header.text"
              @click="rowClicked(rowIdx)"
              :style="clickableRows ? 'cursor: pointer;' : ''"
            >
              {{ getCell(row[header.text]).val }}
              <div
                v-if="showIcon(getCell(row[header.text]), row)"
                class="icon-clickable"
                @click.stop="
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
import { dynamicImports } from "@/Core/DynamicImports";
import { saveTxt } from "@/Core/FS";
import { slugify } from "@/Core/Utils";
import { FileInfo } from "@/FileSystem/FileInfo";
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
  @Prop({ default: false }) clickableRows!: boolean;

  sortColumnName = "";
  sortOrder = "asc";

  /**
   * Get the table data to use.
   *
   * @returns {ITableData} The table data to use.
   */
  get tableDataToUse(): ITableData {
    const dataToUse = {
      headers: this.tableData.headers.map((h) => h), // To copy
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

    // Now sort the data if appropriate.
    if (this.sortColumnName !== "") {
      dataToUse.rows.sort((a, b) => {
        const colName = this.sortColumnName as string;
        const aVal = a[colName] as ICellValue;
        const bVal = b[colName] as ICellValue;

        if (aVal.val < bVal.val) {
          return this.sortOrder === "asc" ? -1 : 1;
        } else if (aVal.val > bVal.val) {
          return this.sortOrder === "asc" ? 1 : -1;
        } else {
          return 0;
        }
      });
    }

    return dataToUse;
  }

  /**
   * Determine if the header (column) is sortable.
   * 
   * @param {IHeader} header  The header to check.
   * @returns {boolean} True if the header is sortable.
   */
  isHeaderSortable(header: IHeader): boolean {
    return header.sortable !== false;
  }


  /**
   * Gets the sort icon to use for the header.
   *
   * @param {IHeader} header  The header to check.
   * @returns {string} The name of the icon to use.
   */
  headerIcon(header: IHeader): string {
    if (header.text === this.sortColumnName) {
      return this.sortOrder === "asc" ? "sort-up" : "sort-down";
    } else {
      return "sort";
    }
  }

  /**
   * Runs when user clicks a header. Sorts the table.
   *
   * @param {IHeader} header  The header that was clicked.
   */
  headerClick(header: IHeader) {
    if (!this.isHeaderSortable(header)) {
      return;
    }

    // So explicit true or undefined both enable sorting.

    if (this.sortColumnName === header.text) {
      // Toggle the sort order.
      switch (this.sortOrder) {
        case "asc":
          this.sortOrder = "desc";
          break;
        case "desc":
          this.sortOrder = "asc";
          this.sortColumnName = "";
          break;
      }
    } else {
      this.sortColumnName = header.text;
      this.sortOrder = "asc";
    }
  }

  /**
   * Gets a cell, cast as ICellValue. Just so typescript will be happy.
   *
   * @param {CellValue} cell  The cell to cast.
   * @returns {ICellValue} The cell cast as ICellValue.
   */
  getCell(cell: CellValue): ICellValue {
    return cell as ICellValue;
  }

  /**
   * Whether to show the icon for a given table row, based on the provided
   * filter function.
   *
   * @param {ICellValue} cell  The cell to check, which provides the filter
   *                           function, etc.
   * @param {any} row          The table row.
   * @returns {boolean} True if the cell has an icon and it should be shown.
   */
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

  /**
   * Whether to show a given table column.
   *
   * @param {IHeader}    header     The table header, which provides the column
   *                                function.
   * @param {ITableData} tableData  The table data, which provides info about
   *                                the column to evaluate.
   * @returns {boolean} True if the column should be shown.
   */
  showColumn(header: IHeader, tableData: ITableData): boolean {
    if (header.showColumnFunc === undefined) {
      // If no filter function defined, always show the column.
      return true;
    }

    return header.showColumnFunc(tableData);

    // (header: IHeader, tableData: ITableData) => boolean
    // return this.tableData.headers.find((h) => h.text === header) !== undefined;
  }

  /**
   *
   * @param {string | undefined} emitName  The name of the event to emit.
   * @param {any}                row       The table row to emit.
   */
  iconClicked(emitName: string | undefined, row: { [key: string]: CellValue }) {
    this.$emit(emitName as string, row);
  }

  /**
   * Runs when the row is clicked. Emits "rowClicked" event.
   *
   * @param {number} rowIdx  The index of the row that was clicked.
   */
  rowClicked(rowIdx: number) {
    this.$emit("rowClicked", this.tableData.rows[rowIdx]);
  }

  /**
   * Download the data in the table.
   * 
   * @param {string} format  The format to use.
   */
  download(format: string) {
    const filename = slugify(this.caption) + "." + format;

    // Convert the data into a more managable format for human consumption.
    // const data = JSON.parse(JSON.stringify(this.tableDataToUse));
    // data.headers = data.headers.map((h: IHeader) => h.text);
    // data.rows = data.rows.map((r: { [key: string]: CellValue }) => {
    //   const row: { [key: string]: any } = {};
    //   for (const header of data.headers) {
    //     row[header] = (r[header] as ICellValue).val;
    //   }
    //   return row;
    // });

    // If you use this one, alredy in the right format, but hidden columns
    // appear.
    const data = JSON.parse(JSON.stringify(this.tableData));
    data.headers = data.headers.map((h: IHeader) => h.text);

    if (format === "json") {
      saveTxt(
        new FileInfo({
          name: filename,
          contents: JSON.stringify(data.rows, null, 2),
        })
      );
    } else {
      dynamicImports.sheetsjs.module
        .then((sheetsjs) => {
          const wb = sheetsjs.utils.book_new();
          const ws = sheetsjs.utils.json_to_sheet(data.rows, {
            header: data.headers,
          });
          sheetsjs.utils.book_append_sheet(wb, ws, "Sheet1");
          sheetsjs.writeFile(wb, filename);
          return;
        })
        .catch((err: any) => {
          throw err;
        });
    }
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
