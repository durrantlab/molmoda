export type IChartDataPoint = [number | string, number];

// See https://www.chartjs.org/docs/latest/charts/area.html for others you might
// implement in time.
export enum ChartType {
    Line = "line",
    Bar = "bar",
    Scatter = "scatter",
}

export enum ChartRatios {
    Ratio1x1 = "ratio-1x1",
    Ratio4x3 = "ratio-4x3",
    Ratio16x9 = "ratio-16x9",
    Ratio21x9 = "ratio-21x9",
}