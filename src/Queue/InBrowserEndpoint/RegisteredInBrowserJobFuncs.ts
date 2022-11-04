/* eslint-disable @typescript-eslint/ban-types */
export const registeredInBrowserJobFuncs: { [key: string]: Function } = {};

/**
 * Register a class of job/command. Don't call this function directly! Do it
 * through the api!
 *
 * @param  {string}   commandName  The name of the command.
 * @param  {Function} func         The function to run when the command is
 *                                 called.
 */
export function registerInBrowserJobFunc(commandName: string, func: Function) {
    registeredInBrowserJobFuncs[commandName] = func;
}
