import {
    UserArg,
    FormElemType,
    IUserArgGroup,
    IUserArgNumber,
    IGenericUserArg,
} from "./FormFullInterfaces";
 
/**
 * Converts a list of user-specified arguments into a command-line string. TODO:
 * Not currently used.
 *
 * @param  {IGenericUserArg[]} userArgs           The user-specified
 *                                                    arguments.
 * @param  {string}                [namePrefix="--"]  The prefix for each
 *                                                    argument name.
 * @returns {string} The command-line string.
 */
export function userParamsToCommandLineString(
    userArgs: IGenericUserArg[],
    namePrefix = "--"
): string {
    // Converts the data structure used to render forms into a flat command line
    // string.
    const cmdLine = userArgs.map((param) => {
        const val =
            typeof param.val === "string" ? `"${param.val}"` : param.val;
        return `${namePrefix}${param.id} ${val}`;
    });

    return cmdLine.join(" ");
}
