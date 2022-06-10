import { Store } from "@/Store"; // path to store file

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $store: Store<State>;
    }
}
