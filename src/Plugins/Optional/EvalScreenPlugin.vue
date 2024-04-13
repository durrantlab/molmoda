<template>
    <PluginComponent
        v-model="open"
        :infoPayload="infoPayload"
        :isActionBtnEnabled="isActionBtnEnabled"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        :submitOnEnter="false"
        cancelBtnTxt="Done"
        actionBtnTxt=""
    >
        <template #afterForm>
            <div class="mt-3">
                <Alert
                    v-for="warning in warnings"
                    :key="warning[0]"
                    :type="warning[1]"
                >
                    {{ warning[0] }}
                </Alert>
            </div>

            <span v-if="analysisVisible">
                <Alert type="info">
                    Your screen includes
                    <strong>{{ numActives }}</strong> active compounds and
                    <strong>{{ numIactives }}</strong> other compounds.
                </Alert>

                <h6>Receiver Operating Characteristic (ROC) Curve</h6>

                <!-- title="Receiver Operating Characteristic Curve" -->
                <Chart
                    xAxisLabel="False Positive Rate"
                    yAxisLabel="True Positive Rate"
                    xAxisLabelHover="FPR"
                    yAxisLabelHover="TPR"
                    xAxisUnits=""
                    yAxisUnits=""
                    :chartData="rocData"
                    chartType="scatter"
                    :ratio="ratio"
                    :smooth="false"
                    :fillUnderLine="true"
                ></Chart>
                <!-- :axisPaddingPercent="5" -->

                <Alert type="info" extraClasses="mt-3">
                    <p>
                        The area under the receiver operating characteristic
                        curve (AUROC) is a useful metric for evaluating the
                        overall performance of a virtual screen, from the
                        best-scoring compound to the worst.
                    </p>

                    <p class="mb-0">
                        The AUROC of your screen is
                        <strong>{{ auroc.toFixed(3) }}</strong
                        >. If you randomly select one of your active compounds
                        and one of your other compounds, the active will have
                        the better docking score
                        <strong>{{ (auroc * 100).toFixed(1) }}%</strong> of the
                        time.
                    </p>
                </Alert>

                <h6>Enrichment Factors (EF)</h6>
                <!-- title="Enrichment Factor" -->
                <Chart
                    xAxisLabel="Number of Top Compounds Considered"
                    yAxisLabel="Enrichment Factor"
                    xAxisLabelHover="Top Compounds"
                    yAxisLabelHover="EF"
                    :xPrecision="0"
                    xAxisUnits=""
                    yAxisUnits=""
                    :chartData="efData"
                    chartType="scatter"
                    :ratio="ratio"
                    :smooth="false"
                ></Chart>
                <!-- :axisPaddingPercent="5" -->

                <Alert type="info" extraClasses="mt-3">
                    <p>
                        An enrichment factor considers the compounds with the
                        best docking scores. It compares the fraction of actives
                        in a set of top-scoring compounds to the overall
                        fraction of actives.
                    </p>
                    <p class="mb-0">
                        For example, your virtual screen included
                        <strong>{{ numActives + numIactives }}</strong>
                        compounds total. Of these,
                        <strong>{{ percentTotalActives }}%</strong>
                        (<strong>{{ numActives }}</strong> compounds) were
                        active. But among the top
                        <strong>{{ bestEFCutoff }}</strong> best-scoring
                        compounds,
                        <strong>{{ percentTopCompoundsActive }}%</strong>
                        (<strong>{{ numActivesAtBestEF }}</strong> compounds)
                        were active, giving an enrichment factor of
                        <strong>{{
                            parseFloat(percentTopCompoundsActive) /
                            parseFloat(percentTotalActives)
                        }}</strong>
                        (<strong>{{ percentTopCompoundsActive }}%</strong> /
                        <strong>{{ percentTotalActives }}%</strong>).
                    </p>
                </Alert>
            </span>
        </template>
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import { ITest } from "@/Testing/TestCmd";
import {
    IUserArgCheckbox,
    IUserArgText,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";
import Chart from "@/UI/Components/Charts/Chart.vue";
import { ChartRatios } from "@/UI/Components/Charts/ChartInterfaces";
import { getMoleculesFromStore } from "@/Store/StoreExternalAccess";
import { TreeNodeType } from "@/UI/Navigation/TreeView/TreeInterfaces";
import { TreeNodeList } from "@/TreeNodes/TreeNodeList/TreeNodeList";
import Alert from "@/UI/Layout/Alert.vue";

interface IActivesOthers {
    labelScores: [number, number][];
    calcAnalysis: boolean;
}

/**
 * EvalScreenPlugin
 */
@Options({
    components: {
        PluginComponent,
        Chart,
        Alert,
    },
})
export default class EvalScreenPlugin extends PluginParentClass {
    menuPath = "Docking/Evaluate Performance...";
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [];
    pluginId = "evalscreen";

    intro = `Calculate receiver operating characteristic and enrichment factor curves.`
    details = `Analyzes the docking scores of both known-active and other (inactive or decoy) compounds to assess how well docking prioritizes the known actives.`;
    title = "Evaluate Docking Performance";

    isActionBtnEnabled = false;

    rocData: [number, number][] = [];
    efData: [number, number][] = [];

    ratio = ChartRatios.Ratio4x3;

    userArgDefaults: UserArg[] = [
        {
            id: "activesLabel",
            label: "",
            val: "active",
            placeHolder: "Known-actives label...",
            description:
                "Label to identify compounds that are active (per experiment). The names of all actives must contain this text.",
        } as IUserArgText,
        {
            id: "otherLabel",
            label: "",
            val: "other",
            placeHolder: "Others label...",
            description:
                "Label to identify other compounds (inactives or decoys). The names of all compounds that are not known actives must contain this text.",
        } as IUserArgText,
        {
            id: "caseInsensitive",
            type: UserArgType.Checkbox,
            label: "Labels are case insensitive",
            description:
                'If checked, label case will be ignored. For example, the label "active" will match compounds with names containing "Active" and "ACTIVE".',
            val: false,
        } as IUserArgCheckbox,
    ];

    analysisVisible = true;

    auroc = 0;
    numActives = 0;
    numIactives = 0;
    bestEFCutoff = 0;
    numActivesAtBestEF = 0;

    warnings: [string, string][] = []; // msg, type

    /**
     * The percent of total compounds that are actives.
     *
     * @returns {string}  The percent of total compounds that are actives.
     */
    get percentTotalActives(): string {
        return (
            (100 * this.numActives) /
            (this.numActives + this.numIactives)
        ).toFixed(0);
    }

    /**
     * Load the image before the popup opens.
     */
    onBeforePopupOpen() {
        this.onUserArgChange();
    }

    /**
     * The percent of top compounds that are actives.
     *
     * @returns {string}  The percent of top compounds that are actives.
     */
    get percentTopCompoundsActive(): string {
        return ((100 * this.numActivesAtBestEF) / this.bestEFCutoff).toFixed(0);
    }

    /**
     * Summarize a list of items, showing a few examples and using "and" for the
     * last one.
     *
     * @param {string[] | Set<string>} items  The items to summarize.
     * @param {number} [count=3]  The number of items to show.
     * @returns {string}  The summarized list.
     */
    examplesSummary(items: string[] | Set<string>, count = 3): string {
        // If it's a set, convert it to array.
        items = Array.from(items);

        let toJoin: string[] = [];
        if (items.length < count) {
            toJoin = items;
        } else {
            // Sort randomly
            const sortedItems = items.sort(() => Math.random() - 0.5);

            // Keep top ones
            toJoin = sortedItems.slice(0, count);

            // Insert "..." in the middle
            toJoin.splice(Math.floor(count / 2), 0, "...");
        }

        // Add "and" to last item
        toJoin[toJoin.length - 1] = `and ${toJoin[toJoin.length - 1]}`;

        return toJoin.length > 2 ? toJoin.join(", ") : toJoin.join(" ");
    }

    /**
     * Get the actives and others from the user arguments.
     *
     * @returns {IActivesOthers}  The labeled scores and whether to calculate
     *                               the analysis.
     */
    getActivesOthers(): IActivesOthers {
        const actives = this.getUserArg("activesLabel");
        const others = this.getUserArg("otherLabel");

        const matchingActives = this.dockedCompoundsWithSubstr(actives);
        const matchingOthers = this.dockedCompoundsWithSubstr(others);

        const matchingActiveTitles = new Set(
            matchingActives.map((node) => node.title) as string[]
        );
        const matchingOtherTitles = new Set(
            matchingOthers.map((node) => node.title) as string[]
        );

        const activeScores = this.getScores(matchingActives);
        const otherScores = this.getScores(matchingOthers);

        this.warnings = [];
        let calcAnalysis = true;

        if (activeScores.length === 0) {
            this.analysisVisible = false;
            this.warnings.push([
                `No compounds found that contain the active label "${actives}".`,
                "danger",
            ]);
            calcAnalysis = false;
        }

        if (otherScores.length === 0) {
            this.analysisVisible = false;
            this.warnings.push([
                `No compounds found that contain the other label "${others}".`,
                "danger",
            ]);
            calcAnalysis = false;
        }

        // Do matchingActiveIDs and matchingOtherTitles have any overlap
        // (intersection)?
        const intersection = new Set(
            [...matchingActiveTitles].filter((x) =>
                matchingOtherTitles.has(x)
            )
        );
        if (intersection.size > 0) {
            this.analysisVisible = false;
            let start = "";
            if (intersection.size === 1) {
                start = "One compound is";
            } else {
                start = `Some compounds (${intersection.size}) are`;
            }
            this.warnings.push([
                `${start} labeled as both active ("${actives}") and other ("${others}"). Examples: ${this.examplesSummary(
                    intersection
                )}.`,
                "danger",
            ]);
            calcAnalysis = false;
        }

        if (!calcAnalysis) {
            return { labelScores: [], calcAnalysis };
        }

        // Are there any compounds in this.compoundsWithDockingScores that
        // aren't in matchingActiveIDs or matchingOtherIDs?
        const allCompoundsTitles = new Set(
            this.compoundsWithDockingScores.map(
                (node) => node.title
            ) as string[]
        );
        const allCompoundsNotInActivesOrOthers = new Set(
            [...allCompoundsTitles].filter(
                (x) =>
                    !matchingActiveTitles.has(x) &&
                    !matchingOtherTitles.has(x)
            )
        );
        if (allCompoundsNotInActivesOrOthers.size > 0) {
            this.analysisVisible = false;
            let msg = "";
            if (allCompoundsNotInActivesOrOthers.size === 1) {
                msg = `One compound (${
                    allCompoundsNotInActivesOrOthers.values().next().value
                }) is not labeled as active ("${actives}") or other ("${others}"). It will be excluded from the analysis.`;
            } else {
                msg = `Some compounds (${
                    allCompoundsNotInActivesOrOthers.size
                }) are not labeled as actives ("${actives}") or others ("${others}"). They will be excluded from the analysis. Examples: ${this.examplesSummary(
                    allCompoundsNotInActivesOrOthers
                )}.`;
            }
            this.warnings.push([msg, "warning"]);
        }

        const activesLabeled = activeScores.map((score: number) => {
            return [score, 1] as [number, number];
        });
        const othersLabeled = otherScores.map((score: number) => {
            return [score, 0] as [number, number];
        });
        const labelScores = activesLabeled.concat(othersLabeled);

        return { labelScores, calcAnalysis };
    }

    /**
     * Calculate the ROC curve and AUROC.
     *
     * @param {number[][]} labelScores  The scores and labels (1 for active, 0
     *                                  for other).
     */
    calcROC(labelScores: [number, number][]) {
        // Calculate ROC curve from scratch.

        // Sort by score
        labelScores.sort((a, b) => {
            return a[0] - b[0];
        });

        // Calculate ROC curve
        const TPR: number[] = [0];
        const FPR: number[] = [0];

        const totalActivesCount = labelScores.filter((score) => {
            return score[1] === 1;
        }).length;
        const totalOthersCount = labelScores.filter((score) => {
            return score[1] === 0;
        }).length;

        for (let i = 0; i < labelScores.length; i++) {
            const thresholdScore = labelScores[i][0];

            const meetsThreshold = labelScores.filter((score) => {
                return score[0] <= thresholdScore;
            });

            const numActives = meetsThreshold.filter((score) => {
                return score[1] === 1;
            }).length;

            const numOthers = meetsThreshold.filter((score) => {
                return score[1] === 0;
            }).length;

            TPR.push(numActives / totalActivesCount);
            FPR.push(numOthers / totalOthersCount);
        }

        this.rocData = TPR.map((_, i) => {
            return [FPR[i], TPR[i]];
        });

        // Use trapezoid rule to calculate AUC
        let auc = 0;
        for (let i = 1; i < TPR.length; i++) {
            const prevTPR = TPR[i - 1];
            const prevFPR = FPR[i - 1];
            const currTPR = TPR[i];
            const currFPR = FPR[i];

            const base = currFPR - prevFPR;
            const height = (currTPR + prevTPR) / 2;

            auc += base * height;
        }
        this.auroc = auc;
    }

    /**
     * Called when the user arguments change. Override this function to react
     * when the user arguments change. Access the arguments using this.userArgs.
     */
    onUserArgChange() {
        const { labelScores, calcAnalysis } = this.getActivesOthers();

        if (!calcAnalysis) {
            return;
        }

        // If you get here, you're ready to do an analysis.
        this.analysisVisible = true;

        this.calcROC(labelScores);

        // Now calculate the enrichment-factor curve
        this.numActives = labelScores.filter((score) => {
            return score[1] === 1;
        }).length;
        this.numIactives = labelScores.length - this.numActives;
        const fractionActivesTotal =
            this.numActives / (this.numActives + this.numIactives);

        let EF: [number, number][] = [];

        for (let i = 0; i < labelScores.length; i++) {
            const thresholdScore = labelScores[i][0];

            const meetsThreshold = labelScores.filter((score) => {
                return score[0] <= thresholdScore;
            });

            const numActives = meetsThreshold.filter((score) => {
                return score[1] === 1;
            }).length;

            const numTotal = meetsThreshold.length;
            const fracActives = numActives / numTotal;

            EF.push([i + 1, fracActives / fractionActivesTotal]);
        }

        this.efData = EF;

        // Get the max EF value
        const maxEF = Math.max(...EF.map((pair) => pair[1]));

        // Get the cutoff that gives the best EF, starting from the end
        for (let i = EF.length - 1; i >= 0; i--) {
            if (EF[i][1] === maxEF) {
                this.bestEFCutoff = i + 1;
                break;
            }
        }

        // Get the number of actives at the best EF cutoff.
        this.numActivesAtBestEF = labelScores
            .slice(0, this.bestEFCutoff)
            .filter((score) => {
                return score[1] === 1;
            }).length;
    }

    /**
     * Get the docking scores for a list of compounds.
     *
     * @param {TreeNodeList} compounds  The compounds to get scores for.
     * @returns {number[]}  The docking scores.
     */
    getScores(compounds: TreeNodeList): number[] {
        return compounds.map((node) => {
            if (!node.data) {
                // This should never happen
                throw new Error("No data found for node.");
            }

            // Get all datas that have "Webina Docking Scores"
            const scoreDatas = Object.keys(node.data).filter((key) => {
                return key.includes("Webina Docking Scores");
            });

            // TODO: Check if more than one (one compound docked into multiple
            // proteins).

            // Get the first one
            return node.data[scoreDatas[0]].data["Score (kcal/mol)"];
        });
    }

    /**
     * Check if this plugin can currently be used.
     *
     * @returns {string | null}  If it returns a string, show that as an error
     *     message. If null, proceed to run the plugin.
     */
    checkPluginAllowed(): string | null {
        const treeNodeList = getMoleculesFromStore();

        let compounds = treeNodeList.flattened.filters.keepType(
            TreeNodeType.Compound
        );

        const commonMsg = "Have you loaded compounds and docked them?";

        if (compounds.length === 0) {
            return `No compounds are currently loaded. ${commonMsg}`;
        }

        compounds = this.compoundsWithDockingScores;

        if (compounds.length === 0) {
            return `No compounds have docking scores. ${commonMsg}`;
        }

        if (compounds.length === 1) {
            return "Only one compound has a docking score. To evaluate a virtual screen, you must dock at least one true ligand and one other (inactive or decoy) molecule.";
        }

        return null;
    }

    /**
     * Get compounds that have docking scores and contain a substring in their
     * title.
     *
     * @param {string} substr  The substring to search for.
     * @returns {TreeNodeList}  The compounds that have docking scores and
     *    contain the substring.
     */
    dockedCompoundsWithSubstr(substr: string): TreeNodeList {
        const compounds = this.compoundsWithDockingScores;
        const caseInsensitive = this.getUserArg("caseInsensitive");

        if (caseInsensitive) {
            substr = substr.toLowerCase();
        }

        return compounds.filter((node) => {
            const title = caseInsensitive
                ? node.title.toLowerCase()
                : node.title;
            return title.includes(substr);
        });
    }

    /**
     * Get compounds that have docking scores.
     *
     * @returns {TreeNodeList}  The compounds that have docking scores.
     */
    get compoundsWithDockingScores(): TreeNodeList {
        const treeNodeList = getMoleculesFromStore();

        let compounds = treeNodeList.flattened.filters.keepType(
            TreeNodeType.Compound
        );

        // Now just keep ones with docking scores.
        compounds = compounds.filter((node) => {
            if (!node.data) {
                // No data. Skip.
                return false;
            }

            return Object.keys(node.data)
                .join("; ")
                .includes("Webina Docking Scores");
        });

        return compounds;
    }

    /**
     * Runs when the user presses the action button and the popup closes.
     */
    // onPopupDone() {}

    /**
     * Each plugin is associated with specific jobs (calculations). Most of
     * these will run in the browser itself, rather than on a remote computing
     * resource. This function runs a single job in the browser (or calls the
     * JavaScript/WASM libraries to run the job). The job-queue system calls
     * `runJob` directly.
     *
     * @param {any} args  One of the parameterSets items submitted via the
     *                    `submitJobs` function. Optional.
     * @returns {Promise<void>}  A promise that resolves when the job is done.
     *     Return void if there's nothing to return.
     */
    runJobInBrowser(args: any): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Gets the test commands for the plugin. For advanced use.
     *
     * @returns {ITest[]}  The selenium test command(s).
     */
    async getTests(): Promise<ITest[]> {
        alert("tests needed!");
        // TODO:
        // const axios = await dynamicImports.axios.module;
        // const promises = [
        //     axios.get("testmols/example.can"),
        //     axios.get("testmols/example.sdf"),
        //     axios.get("testmols/example.pdb"),
        //     axios.get("testmols/example.mol2"),
        //     axios.get("testmols/example_mult.can"),
        //     axios.get("testmols/example_mult.sdf"),
        //     axios.get("testmols/example_mult.pdb"),
        //     axios.get("testmols/example_mult.mol2"),
        // ];

        // const resps = await Promise.all(promises);
        // const txts = resps.map((resp) => resp.data);

        // // "c1ccccc1",
        // // "HETATM    1  C   UNL     1       0.982  -0.028  -0.094  1.00  0.00           C  \nHETATM    2  H   UNL     1       2.074  -0.028  -0.094  1.00  0.00           H  \nHETATM    3  H   UNL     1       0.618   0.313  -1.066  1.00  0.00           H  \nHETATM    4  H   UNL     1       0.618   0.642   0.687  1.00  0.00           H  \nHETATM    5  H   UNL     1       0.618  -1.040   0.096  1.00  0.00           H  ",
        // // "@<TRIPOS>MOLECULE\n*****\n 5 4 0 0 0\nSMALL\nGASTEIGER\n\n@<TRIPOS>ATOM\n      1 C           1.0793   -0.0578    0.0194 C.3     1  UNL1       -0.0776\n      2 H           2.1715   -0.0578    0.0194 H       1  UNL1        0.0194\n      3 H           0.7152   -0.8023    0.7308 H       1  UNL1        0.0194\n      4 H           0.7152   -0.3016   -0.9811 H       1  UNL1        0.0194\n      5 H           0.7152    0.9306    0.3084 H       1  UNL1        0.0194\n@<TRIPOS>BOND\n     1     1     2    1\n     2     1     3    1\n     3     1     4    1\n     4     1     5    1",
        // // "\n OpenBabel08312314413D\n\n  5  4  0  0  0  0  0  0  0  0999 V2000\n    0.9733   -0.0684    0.0679 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.0655   -0.0684    0.0679 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.6093    0.9241    0.3424 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.6092   -0.8023    0.7902 H   0  0  0  0  0  0  0  0  0  0  0  0\n    0.6092   -0.3269   -0.9288 H   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  1  3  1  0  0  0  0\n  1  4  1  0  0  0  0\n  1  5  1  0  0  0  0\nM  END\n$$$$",

        // const tests = txts.map((txt: string) => {
        //     return {
        //         pluginOpen: new TestCmdList().setUserArg(
        //             "molTextArea",
        //             txt,
        //             this.pluginId
        //         ),
        //         afterPluginCloses: new TestCmdList().waitUntilRegex(
        //             "#navigator",
        //             "PastedMol"
        //         ),
        //     };
        // });

        // // Final test to verify error catching
        // tests.push({
        //     pluginOpen: new TestCmdList().setUserArg(
        //         "molTextArea",
        //         "C##moose",
        //         this.pluginId
        //     ),
        //     afterPluginCloses: new TestCmdList().waitUntilRegex(
        //         "#modal-simplemsg",
        //         "File contained no valid"
        //     ),
        // });

        // return tests;

        return [];
    }
}
</script>

<style scoped></style>
