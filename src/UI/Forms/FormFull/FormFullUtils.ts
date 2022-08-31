import {
    FormElement,
    FormElemType,
    IFormGroup,
    IFormNumber,
} from "./FormFullInterfaces";

export interface IUserArg {
    name: string;
    val: any;
}

/**
 * Converts the data structure used to render forms into a flat array of
 * IUserArg.
 * 
 * @param  {FormElement[]} formElements The form elements to convert.
 * @returns {IUserArg[]} The converted array of IUserArg.
 */
export function collapseFormElementArray(
    formElements: FormElement[]
): IUserArg[] {
    const data: IUserArg[] = [];

    const getData = (elems: FormElement[]) => {
        for (const elem of elems) {
            if (elem.type === FormElemType.Group) {
                getData((elem as IFormGroup).childElements);
            } else {
                data.push({
                    name: elem.id,
                    // Just use number for type cast because has val property.
                    val: (elem as IFormNumber).val,
                });
            }
        }
    };

    getData(formElements);

    return data;
}

/**
 * Converts a list of user-specified arguments into a command-line string.
 *
 * @param  {IUserArg[]} userParams        The user-specified arguments.
 * @param  {string}     [namePrefix="--"] The prefix for each argument name.
 * @returns {string} The command-line string.
 */
export function userParamsToCommandLineString(
    userParams: IUserArg[],
    namePrefix = "--"
): string {
    // Converts the data structure used to render forms into a flat command line
    // string.
    const cmdLine = userParams.map((param) => {
        const val =
            typeof param.val === "string" ? `"${param.val}"` : param.val;
        return `${namePrefix}${param.name} ${val}`;
    });

    return cmdLine.join(" ");
}
