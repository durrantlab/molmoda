export interface IContextMenuOption {
    text: string;
    pluginId: string;
    enabled: boolean;
    function: () => void;
}