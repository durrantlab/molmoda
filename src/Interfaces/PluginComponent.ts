import type { Component } from 'vue'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export interface PluginComponent extends Component {
    name: string;
} 