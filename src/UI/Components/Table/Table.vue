<template>
    <div class="subtle-box mb-3" v-if="tableDataToUse">
        <span v-if="tableDataToUse.headers.length > 0" class="table-title px-2">
            {{ caption }}
        </span>
        <slot name="afterHeader"></slot>
        <div v-if="allowFilter" class="px-2 pt-1">
            <FilterInput :list="tableDataToUse.rows" :extractTextToFilterFunc="extractRowText"
                :debounceMs="250" @onFilter="onFilter"></FilterInput>
        </div>
        <div class="table-responsive" :class="{ 'virtual-scroll': shouldVirtualize }"
            :style="scrollContainerStyle" ref="scrollContainer" @scroll="onScroll">
            <table :class="'table table-hover table-sm mb-0 pb-0 table-borderless' +
                (shouldVirtualize ? '' : ' table-striped') +
                (noFixedTable ? '' : ' fixed-table')
                ">
                <thead style="border-top: 0">
                    <tr>
                        <th v-for="header of tableDataToUse.headers" v-bind:key="header.text"
                            class="sticky-header px-2 cell" :style="'font-weight: 550;' +
                                (header.width
                                    ? 'width:' + header.width + 'px;'
                                    : '') +
                                (isHeaderSortable(header)
                                    ? 'cursor: pointer;'
                                    : '')
                                " @click="headerClick(header)">
                            <span v-if="isHeaderSortable(header)">
                                <Icon style="color: #212529" :icon="['fa', headerIcon(header)]" />&nbsp;
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
                            <a @click.prevent="download('csv')" class="link-primary">CSV</a>,
                            <a @click.prevent="download('xlsx')" class="link-primary">XLSX</a>, or
                            <a @click.prevent="download('json')" class="link-primary">JSON</a>
                        </td>
                    </tr>
                </tfoot>
                <tbody>
                    <!-- Top spacer reserves the height of the rows scrolled
                         past, keeping the scrollbar proportional. -->
                    <tr v-if="virtualWindow.topPad > 0" class="virtual-spacer"
                        :style="{ height: virtualWindow.topPad + 'px' }">
                        <td :colspan="tableDataToUse.headers.length"></td>
                    </tr>    
                    <tr v-for="(row, localIdx) of virtualWindow.rows"
                        :key="virtualWindow.startIdx + localIdx"
                        :class="{ 'row-striped': shouldVirtualize && (virtualWindow.startIdx + localIdx) % 2 === 0 }">
                     <td v-for="header of tableDataToUse.headers" v-bind:key="header.text"
                            @click="rowClicked(virtualWindow.startIdx + localIdx, getCell(row[header.text]).val.toString())"
                            class="cell px-2"
                            :style="clickableRows ? 'cursor: pointer;' : ''">
                            <Tooltip :tip="getCellToolTipText(
                                getCell(row[header.text])
                            )
                                ">
                                <span v-html="getCell(row[header.text]).val"></span>
                                <div v-if="
                                    showIcon(getCell(row[header.text]), row)
                                " class="icon-clickable" @click.stop="
                                    iconClicked(
                                        getCell(row[header.text])
                                            .iconClickEmitName,
                                        row
                                    )
                                    ">
                                    <Icon :icon="getCell(row[header.text])
                                        .iconClasses
                                        " />
                                </div>
                            </Tooltip>
                        </td>
                    </tr>
                    <!-- Bottom spacer reserves the height of the rows not yet
                         scrolled into view. -->
                    <tr v-if="virtualWindow.bottomPad > 0" class="virtual-spacer"
                        :style="{ height: virtualWindow.bottomPad + 'px' }">
                        <td :colspan="tableDataToUse.headers.length"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts">
import { saveData } from "@/Core/FS/FS";
import Tooltip from "@/UI/MessageAlerts/Tooltip.vue";
import { Component, Vue, Prop, Watch } from "vue-facing-decorator";
import { ITableData, CellValue, ICellValue, IHeader } from "./Types";
import Icon from "../Icon.vue";
import { IDataRows } from "@/Core/FS/FSInterfaces";
import { slugify } from "@/Core/Utils/StringUtils";
import { dynamicImports } from "@/Core/DynamicImports";
import { addToast } from "@/UI/MessageAlerts/Toasts/ToastManager";
import { PopupVariant } from "@/UI/MessageAlerts/Popups/InterfacesAndEnums";
import { markRaw } from "vue";
import FilterInput from "../FilterInput.vue";


// Unlike ITableData, the keys map to ICellValue, not CellValue (which is slightly broader).
interface ITableDataInternal {
    headers: IHeader[];
    rows: { [key: string]: ICellValue }[];
}
// The slice of rows currently rendered, plus the spacer heights that stand in
// for the rows above and below the window.
interface IVirtualWindow {
    startIdx: number;
    rows: { [key: string]: ICellValue }[];
    topPad: number;
    bottomPad: number;
}
/**
 * Table component
 */
@Component({
    components: {
        Tooltip,
        Icon,
        FilterInput,
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
    // Opt-in row windowing. Off by default so existing consumers render every
    // row exactly as before; only callers that pass virtualize get the
    // bounded scroll box and windowed body.
    @Prop({ default: false }) virtualize!: boolean;
    // Opt-in client-side row filter. Off by default so existing tables are
    // unchanged; when on, a search field appears under the toggles slot.
    @Prop({ default: false }) allowFilter!: boolean;

    sortColumnName = "";
    sortOrder = "asc";
    // Current filter text and the rows FilterInput emitted for it. null means
    // "no active filter" (empty box), in which case every row shows. Mirrors
    // the null-as-unfiltered convention HelpPlugin uses.
    filterStr = "";
    // filterStr removed entirely: the text now lives inside FilterInput, so it
    // can't be a render dependency of this component. Only filteredRows drives
    // a Table re-render, and that changes once per debounced commit.
    filteredRows: { [key: string]: ICellValue }[] | null = null;
    // Per-row searchable-text cache, keyed on the row object. tableDataToUse
    // is a cached computed, so its row objects are stable between keystrokes
    // and the cache hits on every keystroke after the first; it misses (and
    // GC's old entries) automatically when the data recomputes and new row
    // objects appear. markRaw keeps Vue from wrapping it in a reactive proxy,
    // since it's a plain cache with no need for tracking.
    private rowTextCache = markRaw(
        new WeakMap<{ [key: string]: ICellValue }, string>()
    );

    // Virtualization state. Below this row count we render every row so small
    // tables behave as before; above it we window the rows so DOM cost stays
    // bounded regardless of dataset size.
    private readonly virtualizationThreshold = 80;
    private readonly overscan = 8;
    // Seeded so the first paint (before mounted measures the container) shows
    // a screenful of rows rather than an empty body.
    private viewportHeight = 400;
    private scrollTop = 0;
    // Refined from a real rendered row in measureRowHeight; the default is a
    // reasonable estimate for a table-sm row at this font size.
    private estimatedRowHeight = 33;
    private rowHeightMeasured = false;
    // Concrete pixel height for the scroll box, computed from the panel rather
    // than a fixed cap so it fills to the bottom. Seeded so the first paint has
    // a sane size before measurement runs.
    private scrollHeightPx = 400;
    private resizeObserver: ResizeObserver | null = null;
    private onWindowResize = (): void => {
        this.updateScrollHeight();
    };

    /**
     * Recomputes the scroll-box height when the data changes. This covers the
     * case where rows arrive (or toggle) after mount and cross the
     * virtualization threshold: no window resize fires, so without this the
     * box would stay at its seeded height. nextTick lets the new rows lay out
     * (which also shifts the box's top) before measuring.
     */
    @Watch("tableData")
    onTableDataChanged(): void {
        this.$nextTick(() => {
            this.measureRowHeight();
            this.updateScrollHeight();
        });
    }

    /**
     * The rows to actually render: the filtered subset when a filter is
     * active, otherwise every row. Sorting/formatting/column-hiding all
     * happen upstream in tableDataToUse, so this only narrows the row set.
     *
     * @returns {{ [key: string]: ICellValue }[]} Rows to display.
     */
    get displayedRows(): { [key: string]: ICellValue }[] {
        if (!this.allowFilter || this.filteredRows === null) {
            return this.tableDataToUse.rows;
        }
        return this.filteredRows;
    }

    /**
     * Builds the searchable text for one row by joining every visible cell's
     * display value, memoized per row. HTML is stripped so the search matches
     * what the user sees rather than markup; the metaData pseudo-column is
     * skipped. Returns raw (not lowercased) text — FilterInput lowercases.
     *
     * Defined as an arrow field (not a method) so `this` stays bound to this
     * component when FilterInput invokes it as a prop.
     *
     * @param {{ [key: string]: ICellValue }} row  A row from tableDataToUse.
     * @returns {string} Space-joined, HTML-stripped cell text for the row.
     */
    extractRowText = (row: { [key: string]: ICellValue }): string => {
        const cached = this.rowTextCache.get(row);
        if (cached !== undefined) {
            return cached;
        }
        const parts: string[] = [];
        for (const key in row) {
            if (key === "metaData") {
                continue;
            }
            const cell = row[key];
            if (cell && cell.val !== undefined && cell.val !== null) {
                parts.push(this.stripHtml(String(cell.val)));
            }
        }
        const text = parts.join(" ");
        this.rowTextCache.set(row, text);
        return text;
    };

    /**
     * Strips HTML tags via regex rather than DOM parsing. This runs once per
     * row (results are memoized above), but avoiding a div/innerHTML parse per
     * cell keeps even the first filter pass fast on large tables. Good enough
     * for substring matching; exact HTML decoding isn't needed here.
     *
     * @param {string} html  The raw cell value, possibly containing HTML.
     * @returns {string} The text with tags removed.
     */
    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, " ");
        // const div = document.createElement("div");
        // div.innerHTML = html;
        // return div.textContent || div.innerText || "";
    }

    /**
     * Receives filtered rows from FilterInput. null (empty box) means show
     * everything; an array is the matching subset.
     *
     * @param {{ [key: string]: ICellValue }[] | null} rows  Filtered rows.
     */
    onFilter(rows: { [key: string]: ICellValue }[] | null): void {
            this.filteredRows = rows;
    }


    /**
     * Whether the current dataset is large enough to warrant windowing. Small
     * tables (and any caller that didn't opt in) skip virtualization to
     * preserve prior behavior.
     *
     * @returns {boolean} True if rows should be windowed.
     */
    get shouldVirtualize(): boolean {
        return (
            this.virtualize &&
            this.displayedRows.length > this.virtualizationThreshold
        );
    }

    /**
     * Computes the slice of rows to render plus the top/bottom spacer heights.
     * When not virtualizing, returns every row with zero padding so the
     * template renders identically to the non-windowed case.
     *
     * @returns {IVirtualWindow} The render window and spacer heights.
     */
    get virtualWindow(): IVirtualWindow {
        const allRows = this.displayedRows;
        const total = allRows.length;
        if (!this.shouldVirtualize) {
            return { startIdx: 0, rows: allRows, topPad: 0, bottomPad: 0 };
        }
        const rh = this.estimatedRowHeight;
        const visibleCount =
            Math.ceil(this.viewportHeight / rh) + this.overscan * 2;
        let start = Math.floor(this.scrollTop / rh) - this.overscan;
        // Clamp so a stale scrollTop (e.g. after the data shrank) can never
        // push the window past the end and render an empty slice.
        start = Math.max(0, Math.min(start, Math.max(0, total - visibleCount)));
        const end = Math.min(total, start + visibleCount);
        return {
            startIdx: start,
            rows: allRows.slice(start, end),
            topPad: start * rh,
            bottomPad: Math.max(0, (total - end) * rh),
        };
    }
    /**
     * Inline max-height that bounds the scroll box so it clips and scrolls
     * internally. Empty (no cap) when not virtualizing.
     *
     * @returns {{ maxHeight?: string }} Style object for the scroll container.
     */
    get scrollContainerStyle(): { maxHeight?: string } {
        if (!this.shouldVirtualize) {
            return {};
        }
        return { maxHeight: this.scrollHeightPx + "px" };
    }
    /**
     * Tracks scroll position and viewport size so virtualWindow can recompute
     * the visible slice. Row height is measured lazily on the first scroll,
     * once a real row exists to measure.
     *
     * @param {Event} e  The scroll event.
     */
    onScroll(e: Event): void {
        const target = e.target as HTMLElement;
        this.scrollTop = target.scrollTop;
        this.viewportHeight = target.clientHeight;
        if (!this.rowHeightMeasured) {
            this.measureRowHeight();
        }
    }
    /**
     * Measures an actual rendered row to replace the height estimate, so the
     * spacer math matches real layout. Ignores spacer rows.
     */
    private measureRowHeight(): void {
        const container = this.$refs?.scrollContainer as
            | HTMLElement
            | undefined;
        if (!container) {
            return;
        }
        const row = container.querySelector(
            "tbody tr:not(.virtual-spacer)"
        ) as HTMLElement | null;
        if (row && row.offsetHeight > 0) {
            this.estimatedRowHeight = row.offsetHeight;
            this.rowHeightMeasured = true;
        }
    }
    /**
     * Walks up to the nearest ancestor that actually clips overflow, i.e. the
     * element whose bottom edge bounds how tall we can be.
     *
     * @param {HTMLElement} el  The scroll container.
     * @returns {HTMLElement} The clipping ancestor, or documentElement.
     */
    private findScrollParent(el: HTMLElement): HTMLElement {
        let node = el.parentElement;
        while (node) {
            const overflowY = getComputedStyle(node).overflowY;
            if (overflowY === "auto" || overflowY === "scroll") {
                return node;
            }
            node = node.parentElement;
        }
        return document.documentElement;
    }
    /**
     * Sizes the scroll box to fill from its own top down to the bottom of the
     * clipping ancestor, so it reaches the panel's bottom and scrolls in place
     * instead of pushing the panel.
     */
    private updateScrollHeight(): void {
        const el = this.$refs?.scrollContainer as HTMLElement | undefined;
        if (!el || !this.shouldVirtualize) {
            return;
        }
        const ancestor = this.findScrollParent(el);
        const available =
            ancestor.getBoundingClientRect().bottom -
            el.getBoundingClientRect().top -
            8; // small gap so the box doesn't touch the panel edge
        this.scrollHeightPx = Math.max(120, available);
        this.viewportHeight = this.scrollHeightPx;
    }
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
                } else if (
                    typeof rowVal === "string" ||
                    typeof rowVal === "number"
                ) {
                    rowVal = { val: rowVal };
  } else {
  // Shallow copy to prevent mutating the prop
  rowVal = { ...rowVal };
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
        // clipboard. Provide a non-intrusive notification.
        if (cellTxt) {
            const clipboardJs = await dynamicImports.clipboardJs.module;
            clipboardJs.copy(cellTxt);
            addToast(
                "Copied",
                "Text copied to clipboard.",
                PopupVariant.Success,
                undefined,
                { duration: 2000 }
            );
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
        // Use `tableDataToUse` as it contains the currently displayed data (sorted and formatted).
        const dataToExport = this.tableDataToUse;
        if (!dataToExport) {
            return;
        }
        const newRows = dataToExport.rows.map(
            (r: { [key: string]: ICellValue }) => {
                const row: { [key: string]: any } = {};
                for (const header of dataToExport.headers) {
                    const cell = r[header.text];
                    if (cell !== undefined) {
                        const val = cell.val; // It's guaranteed to be an ICellValue object from tableDataToUse
                        // Strip html from val
                        const div = document.createElement("div");
                        div.innerHTML = String(val);
                        const valStripped =
                            div.textContent || div.innerText || val;
                        row[header.text] = valStripped;
                    }
                }
                return row;
            }
        );
        const dataToSave = {
            headers: dataToExport.headers.map((h: IHeader) => h.text),
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
        this.$nextTick(() => {
            this.measureRowHeight();
            this.updateScrollHeight();
        });
        if (this.virtualize) {
            window.addEventListener("resize", this.onWindowResize);
            if (typeof ResizeObserver !== "undefined") {
                const el = this.$refs.scrollContainer as
                    | HTMLElement
                    | undefined;
                const ancestor = el ? this.findScrollParent(el) : null;
                if (ancestor) {
                    // Observe the clipping ancestor (not our own element) so
                    // panel resizes recompute height without a feedback loop.
                    this.resizeObserver = new ResizeObserver(() =>
                        this.updateScrollHeight()
                    );
                    this.resizeObserver.observe(ancestor);
                }
            }
        }
    }
    /**
     * Tears down the resize listeners.
     */
    beforeUnmount() {
        window.removeEventListener("resize", this.onWindowResize);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
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

.cell {
    white-space: nowrap;
}
// Internal scroll for the windowed body. Height is supplied inline by
// scrollContainerStyle rather than a fixed cap.
.virtual-scroll {
    overflow-y: auto;
    /* Breathing room so the footer (CSV/XLSX/JSON links) clears the panel
    edge and stays clickable when scrolled all the way down. */
    padding-bottom: 0.75rem;
}
// The floating header needs an opaque background (and to sit above the rows)
// or scrolled content shows through it.
.virtual-scroll .sticky-header {
    background-color: var(--bs-body-bg, #fff);
    z-index: 2;
    box-shadow: inset 0 -1px 0 #dee2e6;
}
/* Manual striping keyed to the absolute row index. table-striped's
:nth-of-type parity is unstable once spacer rows shift the window, so we
stripe explicitly when virtualizing. Applied to cells so it shows through
Bootstrap's per-cell background, while :hover still wins. */
.row-striped > td {
    background-color: rgba(0, 0, 0, 0.05);
}
/* Spacers only reserve vertical space; they must never show borders or
striping or react to hover. */
.virtual-spacer,
.virtual-spacer > td {
    padding: 0;
    background-color: transparent;
}
</style>

<style lang="scss">
.table-title {
    font-weight: 550;
    font-size: 16px;
}
</style>
