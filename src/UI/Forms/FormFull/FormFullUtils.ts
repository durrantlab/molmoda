import {
    FormElement,
    FormElemType,
    IFormElement,
    IFormGroup,
    IFormNumber,
} from "./FormFullInterfaces";

export interface IUserArg {
    name: string;
    val: any;
}

export function collapseFormElementArray(
    formElements: FormElement[]
): IUserArg[] {
    // Converts the data structure used to render forms into a flat associative
    // array, varName => value.
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
