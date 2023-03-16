/* eslint-disable jsdoc/check-tag-names */
import {
    ITest,
    _TestClick,
    _TestWaitUntilRegex,
} from "@/Testing/TestCmd";
import { Vue } from "vue-class-component";

/**
 * TestingMixin
 */
export class TestingMixin extends Vue {
    private testProteinLoadRequested = false;

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @gooddefault
     * @document
     * @returns {ITest[] | ITest}  The selenium test command(s).
     */
    getTests(): ITest[] | ITest {
        const afterPluginCloses =
            (this as any).logJob === true
                ? [
                      new _TestWaitUntilRegex(
                          "#log",
                          'Job "' + (this as any).pluginId + ':.+?" ended'
                      ).cmd,
                  ]
                : [];
        return [
            {
                beforePluginOpens: [],
                pluginOpen: [],
                closePlugin: [
                    new _TestClick(
                        `#modal-${(this as any).pluginId} ".action-btn"`
                    ).cmd
                ],
                afterPluginCloses,
            } as ITest,
        ];
    }
}
