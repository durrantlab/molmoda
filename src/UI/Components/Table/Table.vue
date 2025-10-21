<template>
    <div class="subtle-box mb-3" v-if="tableDataToUse">
        <span v-if="tableDataToUse.headers.length > 0" class="table-title px-2">
            {{ caption }}
        </span>
        <slot name="afterHeader"></slot>

        <div class="table-responsive">
            <table
                :class="
                    'table table-striped table-hover table-sm mb-0 pb-0 table-borderless' +
                    (noFixedTable ? '' : ' fixed-table')
                "
            >
                <thead style="border-top: 0">
                    <tr>
                        <th
                            v-for="header of tableDataToUse.headers"
                            v-bind:key="header.text"
                            class="sticky-header px-2 cell"
                            :style="
                                'font-weight: 550;' +
                                (header.width
                                    ? 'width:' + header.width + 'px;'
                                    : '') +
                                (isHeaderSortable(header)
                                    ? 'cursor: pointer;'
                                    : '')
                            "
                            @click="headerClick(header)"
                        >
                            <span v-if="isHeaderSortable(header)">
                                <Icon
                                    style="color: #212529"
                                    :icon="['fa', headerIcon(header)]"
                                />&nbsp;
                            </span>
                            <!-- Show note as a tool tip if defined.-->
                            <Tooltip :tip="getHeaderToolTipText(header)">
                                {{ header.text }}
                            </Tooltip>
                        </th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <td :colspan="tableData?.headers.length" class="px-2">
                            Download as
                            <a
                                @click.prevent="download('csv')"
                                class="link-primary"
                                >CSV</a
                            >,
                            <a
                                @click.prevent="download('xlsx')"
                                class="link-primary"
                                >XLSX</a
                            >, or
                            <a
                                @click.prevent="download('json')"
                                class="link-primary"
                                >JSON</a
                            >
                        </td>
                    </tr>
                </tfoot>
                <tbody>
                    <tr
                        v-for="(row, rowIdx) of tableDataToUse.rows"
                        v-bind:key="rowIdx"
                    >
                        <td
                            v-for="header of tableDataToUse.headers"
                            v-bind:key="header.text"
                            @click="rowClicked(rowIdx, getCell(row[header.text]).val.toString())"
                            class="cell px-2"
                            :style="clickableRows ? 'cursor: pointer;' : ''"
                        >
                            <Tooltip
                                :tip="
                                    getCellToolTipText(
                                        getCell(row[header.text])
                                    )
                                "
                            >
                                <span v-html="getCell(row[header.text]).val"></span>
                                <div
                                    v-if="
                                        showIcon(getCell(row[header.text]), row)
                                    "
                                    class="icon-clickable"
                                    @click.stop="
                                        iconClicked(
                                            getCell(row[header.text])
                                                .iconClickEmitName,
                                            row
                                        )
                                    "
                                >
                                    <Icon
                                        :icon="
                                            getCell(row[header.text])
                                                .iconClasses
                                        "
                                    />
                                </div>
                            </Tooltip>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import { saveData } from "@/Core/FS/FS";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { ITableData, CellValue, ICellValue, IHeader } from "./Types";
import Icon from "../Icon.vue";
import { IDataRows } from "@/Core/FS/FSInterfaces";
import { slugify } from "@/Core/Utils/StringUtils";
import { dynamicImports } from "@/Core/DynamicImports";

// Unlike ITableData, the keys map to ICellValue, not CellValue (which is slightly broader).
interface ITableDataInternal {
    headers: IHeader[];
    rows: { [key: string]: ICellValue }[];
}

/**
 * Table component
 */
@Options({
    components: {
        Tooltip,
        Icon,
    },
})
export default class Table extends Vue {
    @Prop({ default: { headers: [], rows: [] } }) tableData!: ITableData;
    @Prop({ default: 2 }) precision!: number;
    @Prop({ default: "" }) caption!: string;
 @Prop({ required: true }) downloadFilenameBase!: string;
    @Prop({ default: true }) noFixedTable!: boolean;
    @Prop({ default: false }) clickableRows!: boolean;
    @Prop({ default: "" }) initialSortColumnName!: string;
    @Prop({ default: "asc" }) initialSortOrder!: string;

    sortColumnName = "";
    sortOrder = "asc";

    /**
     * Get the table data to use.
     *
     * @returns {ITableDataInternal} The table data to use.
     */
    get tableDataToUse(): ITableDataInternal {
        const dataToUse = {
            headers: this.tableData.headers.map((h) => h), // To copy
            rows: [] as { [key: string]: ICellValue }[],
        };

        // v-if="showColumn(header, tableDataToUse)"

        for (const row of this.tableData.rows) {
            const newRow: { [key: string]: ICellValue } = {};
            for (const header of this.tableData.headers) {
                let rowVal = row[header.text] as CellValue;

                if (rowVal === undefined) {
                    // If the value is undefined, just use an empty string.
                    rowVal = { val: "" };
                }

                // Convert the val to ICellValue.
                if (typeof rowVal === "string" || typeof rowVal === "number") {
                    rowVal = { val: rowVal };
                }

                // If it's a number but not an integer, round it to the precision.
                if (typeof rowVal.val === "number" && rowVal.val % 1 !== 0) {
                    // Not an integer.
                    rowVal.val = rowVal.val.toFixed(this.precision);

                    if (rowVal.val === "-0") {
                        rowVal.val = "0";
                    }

                    // Convert back to number
                    rowVal.val = Number(rowVal.val);
                }

                newRow[header.text] = rowVal;

                newRow["metaData"] = {
                    val: 0, // Just a dummy value.
                    metaData: { treeNodeId: row.id },
                };
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

                const val1 =
                    aVal.sortVal !== undefined ? aVal.sortVal : aVal.val;
                const val2 =
                    bVal.sortVal !== undefined ? bVal.sortVal : bVal.val;

                if (val1 < val2) {
                    return this.sortOrder === "asc" ? -1 : 1;
                } else if (val1 > val2) {
                    return this.sortOrder === "asc" ? 1 : -1;
                } else {
                    return 0;
                }
            });
        }

        return dataToUse;
    }

    /**
     * Get the header tool tip text.
     *
     * @param {IHeader} header  The header to get the tool tip text for.
     * @returns {string} The tool tip text.
     */
    getHeaderToolTipText(header: IHeader): string {
        return header.note !== undefined ? header.note : header.text;
    }

    /**
     * Get the cell tool tip text.
     *
     * @param {ICellValue} cellValue  The cell value to get the tool tip text for.
     * @returns {string | number} The tool tip text.
     */
    getCellToolTipText(cellValue: ICellValue): string | number {
        // Strip html
        const div = document.createElement("div");
        div.innerHTML = cellValue.val as string;

        return div.textContent || div.innerText || cellValue.val;
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
    iconClicked(
        emitName: string | undefined,
        row: { [key: string]: CellValue }
    ) {
        this.$emit(emitName as string, row);
    }

    /**
     * Runs when the row is clicked. Emits "rowClicked" event.
     *
     * @param {number} rowIdx  The index of the row that was clicked.
     * @param {string} cellTxt The text of the cell that was clicked.
     */
    async rowClicked(rowIdx: number, cellTxt?: string) {
        if (this.tableDataToUse === undefined) {
            return;
        }

        // move meta data to top level for convenience.
        let toEmit = {
            ...this.tableDataToUse.rows[rowIdx],
        };

        if (this.tableDataToUse.rows[rowIdx].metaData.metaData) {
            toEmit = {
                ...toEmit,
                ...this.tableDataToUse.rows[rowIdx].metaData.metaData,
            };
            if (toEmit.metaData) {
                delete toEmit.metaData;
            }
        }
        this.$emit("rowClicked", toEmit);

        // Separate from above, make it so value of content is copied to the
        // clipboard. TODO: The user has no indication that the text has been
        // copied. We need some sort of non-intrusive notification.
        if (cellTxt) {
            const clipboardJs = await dynamicImports.clipboardJs.module;
            clipboardJs.copy(cellTxt);
        }

    }

    /**
     * Download the data in the table.
     *
     * @param {string} format  The format to use.
     */
    download(format: string) {
        // const filename = slugify(this.caption) + "." + format;
        const filename = slugify(this.downloadFilenameBase) + "." + format;

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

        // If you use this one, already in the right format, but hidden columns
        // appear.
        const data = JSON.parse(
            JSON.stringify(this.tableData)
        ) as ITableDataInternal;

        // Remove column "id" if it exists. TODO: Would be good to remove all
        // hidden ones.
        for (const header of data.headers) {
            if (header.text === "id") {
                const headerIndex = data.headers.indexOf(header);
                data.headers.splice(headerIndex, 1);

                for (const row of data.rows) {
                    delete row[header.text];
                }
                break;
            }
        }

        // Remove "val" from ICellValue.
        const newRows = data.rows.map((r: { [key: string]: ICellValue }) => {
            const row: { [key: string]: any } = {};
            for (const header of data.headers) {
                const val = (r[header.text] as ICellValue).val
                if (val !== undefined) {
                    // Strip html from val
                    const div = document.createElement("div");
                    div.innerHTML = val as string;
                    const valStripped = div.textContent || div.innerText || val;

                    row[header.text] = valStripped;
                }
            }
            return row;
        });

        const dataToSave = {
            headers: data.headers.map((h: IHeader) => h.text),
            rows: newRows as IDataRows,
        };

        saveData(dataToSave, filename, format);
    }

    /**
     * Runs when the component is mounted.
     */
    mounted() {
        this.sortColumnName = this.initialSortColumnName;
        this.sortOrder = this.initialSortOrder;
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

.cell {
    white-space: nowrap;
}
</style>

<style lang="scss">
.table-title {
    font-weight: 550;
    font-size: 16px;
}
</style>
@/Core/FS/FS
