<template>
    <div v-if="messages.length <= 1">
        <p
            class="mb-0" style="overflow: hidden; text-overflow: ellipsis"
            v-html="messages[0].message"
        ></p>
        <span class="d-block text-end">
            <small
                class="fw-light text-muted fst-italic"
                v-if="messages[0].datetime !== undefined"
            >
                {{ messages[0].datetime }}
            </small>
        </span>
    </div>
    <span v-else>
        <Alert
            v-for="simpleMsg of messages"
            :key="simpleMsg.message"
            :type="simpleMsg.variant"
            extraClasses="p-2 mb-2"
        >
            <span v-html="alertTxt(simpleMsg)"></span>
            <!-- <h6 class="alert-heading">{{ simpleMsg.title }}</h6> -->
            <!-- <b>{{ simpleMsg.title }}</b -->
            <!-- >. {{ simpleMsg.message }} -->
        </Alert>
    </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { ISimpleMsg } from "../Layout/Popups/InterfacesAndEnums";
import Alert from "../Layout/Alert.vue";

/**
 * MessageList component
 */
@Options({
    components: { Alert },
})
export default class MessageList extends Vue {
    @Prop({ default: [] }) messages!: ISimpleMsg[];

    /**
     * The alert text to display.
     * 
     * @param {ISimpleMsg} simpleMsg The simple message.
     * @returns {string} The alert text to display.
     */
    alertTxt(simpleMsg: ISimpleMsg): string {
        let resp = "";

        const header = `<b>${simpleMsg.title}</b>. `
        if (simpleMsg.title !== "") {
            resp += header;
        }
        resp += simpleMsg.message;

        // If messages started with <p>, but bold title inside <p>
        if (resp.startsWith(header + "<p>")) {
            resp = resp.slice(header.length + 3);
            resp = "<p>" + header + resp;
        }

        // Add date time if it exists
        if (simpleMsg.datetime !== undefined) {
            resp += `<span class="mt-1 d-block text-end"><small class="fw-light fst-italic">${simpleMsg.datetime}</small></span>`;
        }
        return resp;
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
