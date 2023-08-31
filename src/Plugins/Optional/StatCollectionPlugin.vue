<template>
    <PluginComponent
        :infoPayload="infoPayload"
        v-model="open"
        @onPopupDone="onPopupDone"
        @onUserArgChanged="onUserArgChanged"
        actionBtnTxt="OK"
    >
        <div>
            <p>Dear User,</p>
            <p>Your contribution matters!</p>
            <p>
                We are a university-driven scientific organization dedicated to
                pushing the boundaries of knowledge. To sustain our efforts and
                secure funding, we rely on understanding app usage. Rest
                assured, we are transparent in our data practices. We will set
                cookies to gather anonymous statistics, which help us optimize
                our tools without compromising your privacy. Your data remains
                strictly confidential, and we only collect usage patterns for
                publication purposes.
            </p>
            <p>Join us in advancing research and innovation.</p>
            <p>Durrantlab</p>
        </div>
    </PluginComponent>
</template>

<script lang="ts">
import PluginComponent from "../Parents/PluginComponent/PluginComponent.vue";
import { PluginParentClass } from "../Parents/PluginParentClass/PluginParentClass";
import { Options } from "vue-class-component";
import Cookies from "js-cookie";
import {
    ISoftwareCredit,
    IContributorCredit,
} from "@/Plugins/PluginInterfaces";
import {
    IUserArgCheckbox,
    IUserArgGroup,
    IUserArgText,
    UserArg,
    UserArgType,
} from "@/UI/Forms/FormFull/FormFullInterfaces";

@Options({
    components: {
        PluginComponent,
    },
})
export default class StatCollectionPlugin extends PluginParentClass {
    // menuPath = "Test/StatCollection...";
    menuPath = null;
    softwareCredits: ISoftwareCredit[] = [];
    contributorCredits: IContributorCredit[] = [
        {
            name: "Yuri K. Kochnev",
            url: "durrantlab.com",
        },
    ];
    pluginId = "statcollection";
    intro = "Help Us Improve!";
    title = "StatCollection";

    open = Cookies.get("statcollection") ? false : true;

    userArgDefaults: UserArg[] = [
        {
            id: "statcollection",
            label: "Confirm selection",
            open: true,
            val: [
                {
                    id: "statcollection",
                    label: "Anonymous statisctics collection",
                    val: false,
                    type: UserArgType.Checkbox,
                } as IUserArgCheckbox,
            ],
        } as IUserArgGroup,
    ];

    onPopupDone() {
        Cookies.remove("statcollection");
        /* eslint-disable-next-line  */
        // @ts-ignore: Object is possibly 'null'.
        if (this.userArgs[0].val[0].val) {
            Cookies.set("statcollection", "true", {
                expires: 365,
                sameSite: "strict",
            });
        } else {
            Cookies.set("statcollection", "false", {
                expires: 7,
                sameSite: "strict",
            });
        }
        console.log(Cookies.get("statcollection"));
    }

    runJobInBrowser(args: any): Promise<void> {
        console.log("runJobInBrowser");
        return Promise.resolve();
    }

    getTests() {
        return [];
    }
}
</script>

<style scoped></style>
