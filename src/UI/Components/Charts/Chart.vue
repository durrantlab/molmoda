<template>
    <span>
        <h6 v-if="title !== ''" class="text-center mb-0">{{ title }}</h6>
        <div :class="'ratio ' + ratio">
            <canvas ref="chartCanvas"></canvas>
        </div>

        <small>
            Download as <a @click.prevent="download('png')" href="#">PNG</a>,
            <a @click.prevent="download('csv')" href="#">CSV</a>,
            <a @click.prevent="download('xlsx')" href="#">XLSX</a>, or
            <a @click.prevent="download('json')" href="#">JSON</a>
        </small>
    </span>
</template>

<script lang="ts">
import { dynamicImports } from "@/Core/DynamicImports";
import { saveData } from "@/Core/FS/FS";
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import { ChartRatios, ChartType, IChartDataPoint } from "./ChartInterfaces";
import { slugify } from "@/Core/Utils";

// Assuming you have a dynamicImports object similar to the chartJsLoader example

/**
 * Chart component.
 */
@Options({
    components: {},
})
export default class Chart extends Vue {
    @Prop({ default: "" }) title!: string;
    @Prop({ required: true }) xAxisLabel!: string;
    @Prop({ required: true }) yAxisLabel!: string;
    @Prop({ default: undefined }) xAxisLabelHover!: string;
    @Prop({ default: undefined }) yAxisLabelHover!: string;
    @Prop({ default: "MISSING" }) xAxisUnits!: string; // Set to "" to ignore (try to encourage units)
    @Prop({ default: "MISSING" }) yAxisUnits!: string; // Set to "" to ignore (try to encourage units)
    @Prop({ default: 2 }) xPrecision!: number;
    @Prop({ default: 2 }) yPrecision!: number;
    @Prop({ required: true }) chartData!: IChartDataPoint[];
    @Prop({ default: ChartType.Scatter }) chartType!: ChartType;
    @Prop({ default: 0 }) axisPaddingPercent!: number;
    @Prop({ default: false }) fillUnderLine!: boolean;
    @Prop({ default: ChartRatios.Ratio1x1 }) ratio!: ChartRatios;
    @Prop({ default: false }) smooth!: boolean;

    private chartInstance: any = null;

    /**
     * Mounted lifecycle hook.
     */
    async mounted() {
        await this.createChart();
    }

    /**
     * Get the x-axis label to use.
     * 
     * @returns {string}  The x-axis label to use.
     */
    get xAxisLabelToUse(): string {
        return (
            this.xAxisLabel +
            (this.xAxisUnits ? " (" + this.xAxisUnits + ")" : "")
        );
    }

    /**
     * Get the y-axis label to use.
     * 
     * @returns {string}  The y-axis label to use.
     */
    get yAxisLabelToUse(): string {
        return (
            this.yAxisLabel +
            (this.yAxisUnits ? " (" + this.yAxisUnits + ")" : "")
        );
    }

    /**
     * Called when the data changes. Recreates the chart.
     */
    @Watch("data", { deep: true })
    async onDataChange() {
        await this.createChart();
    }

    /**
     * Download the chart as a file.
     * 
     * @param {string} format  The format to download as.
     */
    async download(format: string) {
        const filename = slugify(this.title) + "." + format;
        if (format === "png") {
            const fileSaver = await dynamicImports.fileSaver.module;

            const canvas = this.$refs.chartCanvas as HTMLCanvasElement;

            if (canvas) {
                canvas.toBlob((blob) => {
                    fileSaver.saveAs(blob, filename);
                });
            }
        } else {
            // One of the data formats.
            const dataConverted = {
                headers: [this.xAxisLabelToUse, this.yAxisLabelToUse],
                rows: this.chartData.map((d) => {
                    const d2 = {} as any;
                    d2[this.xAxisLabelToUse] = d[0];
                    d2[this.yAxisLabelToUse] = d[1];
                    return d2;
                }),
            };
            saveData(dataConverted, filename, format);
        }
    }

    /**
     * Create the chart.
     */
    async createChart() {
        const chartJs = await dynamicImports.chartJs.module; // Load Chart.js dynamically
        if (this.chartInstance) {
            this.chartInstance.destroy(); // Destroy the existing chart instance if it exists
        }

        // Convert data
        const dataToUse = this.chartData.map((d) => ({ x: d[0], y: d[1] }));

        const scaleOptions = {
            x: {
                title: {
                    display: true,
                    text: this.xAxisLabelToUse,
                },
            },
            y: {
                title: {
                    display: true,
                    text: this.yAxisLabelToUse,
                },
            },
        };

        const options = {
            responsive: true, // Make the chart responsive
            maintainAspectRatio: false, // Allow the chart to fill its container
            scales: scaleOptions,
            plugins: {
                // title: {
                //     display: true,
                //     text: this.title,
                // },
                legend: {
                    display: false,
                    position: "bottom",
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label: (context: any) => {
                            const x =
                                typeof context.parsed.x === "number"
                                    ? context.parsed.x.toFixed(this.xPrecision)
                                    : context.parsed.x;
                            const y =
                                typeof context.parsed.y === "number"
                                    ? context.parsed.y.toFixed(this.yPrecision)
                                    : context.parsed.y;

                            const xAxisLbl = this.xAxisLabelHover
                                ? this.xAxisLabelHover
                                : this.xAxisLabel;
                            const yAxisLbl = this.yAxisLabelHover
                                ? this.yAxisLabelHover
                                : this.yAxisLabel;

                            return `${xAxisLbl}: ${x}, ${yAxisLbl}: ${y}`;
                        },
                    },
                },
            },
        };

        // Add a padding if necessary
        if (this.axisPaddingPercent !== 0) {
            let minY = Math.min(...dataToUse.map((d) => d.y));
            let maxY = Math.max(...dataToUse.map((d) => d.y));
            const rangeY = maxY - minY;
            const paddingY = rangeY * (this.axisPaddingPercent / 100);
            minY -= paddingY;
            maxY += paddingY;
            (scaleOptions.y as any).min = minY;
            (scaleOptions.y as any).max = maxY;

            // Similarly scale X if it is numbers (not strings).
            if (dataToUse.length > 0 && typeof dataToUse[0].x === "number") {
                let minX = Math.min(...dataToUse.map((d) => d.x as number));
                let maxX = Math.max(...dataToUse.map((d) => d.x as number));
                const rangeX = maxX - minX;
                const paddingX = rangeX * (this.axisPaddingPercent / 100);
                minX -= paddingX;
                maxX += paddingX;
                (scaleOptions.x as any).min = minX;
                (scaleOptions.x as any).max = maxX;
            }
        }

        if (this.smooth) {
            (options as any).elements = { line: { tension: 0.4 } };
        }

        this.chartInstance = new chartJs.Chart(this.$refs.chartCanvas, {
            type: this.chartType,
            data: {
                datasets: [
                    {
                        label: "", // this.title,
                        data: dataToUse,
                        fill: this.fillUnderLine, // Fill under line
                        showLine: true,
                        pointRadius: 3,
                    },
                ],
            },
            options: options,
        });
    }
}
</script>

<style scoped>
canvas {
    width: 100%;
    height: 100%;
}
</style>
@/Core/FS/FS
