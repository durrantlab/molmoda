import { store } from "@/Store";
import { ITestCommand, TestCommand } from "./TestInterfaces";

/**
 * Adds the specified commands to the list of commands to run.
 *
 * @param  {any[]} cmds  The commands to add.
 */
export function addTestsToCmdList(cmds: any[]) {
    const testsStr = store.state.test.cmds;
    const tests = testsStr === "" ? [] : JSON.parse(testsStr);
    tests.push(...cmds);
    store.commit("setVar", {
        name: "cmds",
        val: JSON.stringify(tests),
        module: "test",
    });
}

/**
 * A class to generate the command to type text into a selector.  Should only be
 * called from class TestCmdList. The parent that all test commands should
 * inherit from.
 */
export abstract class TestCmdParent {
    /**
     * Generates the command.
     *
     * @returns {ITestCommand}  The command.
     */
    abstract get cmd(): ITestCommand;

    /**
     * On rare occasions, you might want to add a test directly to the list,
     * outside of the TestCmdList system. Not recommended, but you can use this
     * if needed.
     */
    addToCmdList() {
        addTestsToCmdList([this.cmd]);
    }
}

/**
 * A class to generate the command to click a selector. Should only be called
 * from class TestCmdList.
 */
export class TestClick extends TestCmdParent {
    private selector: string;
    private shiftPressed: boolean;

    /**
     * Creates an instance of TestClick.
     *
     * @param  {string}  selector     The selector to click.
     * @param  {boolean} [shiftPressed=false]  If true, the shift key will be
     *           pressed while clicking.
     */
    constructor(selector: string, shiftPressed = false) {
        super();
        this.selector = selector;
        this.shiftPressed = shiftPressed;
    }

    /**
     * Generates the command to click the selector.
     *
     * @returns {ITestCommand}  The command to click the selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Click,
            data: this.shiftPressed,
        };
    }
}

/**
 * A class to generate the command to wait for a specified duration.  Should
 * only be called from class TestCmdList.
 */
export class TestWait extends TestCmdParent {
    private duration: number;

    /**
     * Creates an instance of TestWait.
     *
     * @param  {number} [durationInSecs=1]  The duration to wait, in seconds.
     */
    constructor(durationInSecs = 1) {
        super();
        this.duration = durationInSecs;
    }

    /**
     * Generates the command to wait for the specified duration.
     *
     * @returns {ITestCommand}  The command to wait for the specified duration.
     */
    get cmd(): ITestCommand {
        return {
            cmd: TestCommand.Wait,
            data: this.duration,
        };
    }
}

/**
 * A class to generate the command to type text into a selector.  Should only be
 * called from class TestCmdList.
 */
export class TestText extends TestCmdParent {
    private selector: string;
    private text: string;

    /**
     * Creates an instance of TestText.
     *
     * @param  {string} selector  The selector to type into.
     * @param  {string} text   The text to type.
     */
    constructor(selector: string, text: string) {
        super();
        this.selector = selector;
        this.text = text;
    }

    /**
     * Generates the command to type the specified text into the specified
     * selector.
     *
     * @returns {ITestCommand}  The command to type the specified text into the
     *  specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Text,
            data: this.text,
        };
    }
}

/**
 * A class to generate the command to wait until the specified regex is found in
 * the specified selector. Should only be called from class TestCmdList.
 */
export class TestWaitUntilRegex extends TestCmdParent {
    private selector: string;
    private regex: string;

    /**
     * Creates an instance of TestWaitUntilRegex.
     *
     * @param  {string} selector  The selector to monitor.
     * @param  {string} regex  The regex to wait for.
     */
    constructor(selector: string, regex: string) {
        super();
        this.selector = selector;
        this.regex = regex;
    }

    /**
     * Generates the command to wait until the specified regex is found in the
     * specified selector.
     *
     * @returns {ITestCommand}  The command to wait until the specified regex is
     * found in the specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.WaitUntilRegex,
            data: this.regex,
        };
    }
}

/**
 * A class to generate the command to wait until the specified regex is not
 * found in the specified selector. Should only be called from class
 * TestCmdList.
 */
export class TestWaitUntilNotRegex extends TestCmdParent {
    private selector: string;
    private regex: string;

    /**
     * Creates an instance of TestWaitUntilRegex.
     *
     * @param  {string} selector  The selector to monitor.
     * @param  {string} regex  The regex to wait for.
     */
    // eslint-disable-next-line sonarjs/no-identical-functions
    constructor(selector: string, regex: string) {
        super();
        this.selector = selector;
        this.regex = regex;
    }

    /**
     * Generates the command to wait until the specified regex is found in the
     * specified selector.
     *
     * @returns {ITestCommand}  The command to wait until the specified regex is
     * found in the specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.WaitUntilNotRegex,
            data: this.regex,
        };
    }
}

/**
 * A class to generate the command to upload a file. Should only be called from
 * class TestCmdList.
 */
export class TestUpload extends TestCmdParent {
    private selector: string;
    private filePath: string;

    /**
     * Creates an instance of TestUpload.
     *
     * @param  {string} selector  The selector to upload to.
     * @param  {string} filePath  The file path to upload.
     */
    constructor(selector: string, filePath: string) {
        super();
        this.selector = selector;
        if (filePath.startsWith("file://")) {
            filePath = filePath.substring(7);
        }
        this.filePath = filePath;
    }
    
    /**
     * Generates the command to upload the specified file to the specified
     * selector.
     *
     * @returns {ITestCommand}  The command to upload the specified file to the
     * specified selector.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.Upload,
            data: this.filePath,
        };
    }
}

/**
 * A class to generate the command for displaying a note during a tour. Should
 * only be called from class TestCmdList.
 */
export class TestTourNote extends TestCmdParent {
    private selector: string;
    private message: string;

    /**
     * Creates an instance of TestTourNote.
     *
     * @param {string} selector  The selector for the element to associate the
     *           note with.
     * @param {string} message   The message to display in the note.
     */
    constructor(selector: string, message: string) {
        super();
        this.selector = selector;
        this.message = message;
    }

    /**
     * Generates the command to display the tour note.
     *
     * @returns {ITestCommand}  The command.
     */
    get cmd(): ITestCommand {
        return {
            selector: this.selector,
            cmd: TestCommand.TourNote,
            data: this.message,
        };
    }
}
