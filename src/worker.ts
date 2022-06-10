import { sendResponseToMainThread, waitForDataFromMainThread } from "./Core/WebWorkers/WorkerHelper";

waitForDataFromMainThread().then((payload) => {
  sendResponseToMainThread("hi");
});
