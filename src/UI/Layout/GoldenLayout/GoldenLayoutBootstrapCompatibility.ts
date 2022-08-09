let _layoutParentDOM: HTMLElement;

const _queryToClasses: { [key: string]: string[] } = {
    ".lm_tab:not(.lm_active)": ["btn", "btn-default"],
    ".lm_active": ["btn", "btn-primary", "text-white"],
    ".lm_tab": ["reduced-padding-on-right"],
    ".lm_header": ["bg-light"],
    ".lm_drag_handle": ["bg-light"]
};

let _allClasses: Set<string>;

// Add color classes
export function addBootstrapColorClasses() {
    if (!_layoutParentDOM) {
        _layoutParentDOM = document.querySelectorAll(
            ".lm_goldenlayout"
        )[0] as HTMLElement;
    }

    // Get all classes
    if (!_allClasses) {
        _allClasses = new Set([]);
        for (const query in _queryToClasses) {
            const classes: string[] = _queryToClasses[query];
            for (const className of classes) {
                _allClasses.add(className);
            }
        }
    }

    // Remove classes
    for (const cls of _allClasses) {
        const elements = _layoutParentDOM.querySelectorAll(`.${cls}`);
        for (const element of elements) {
            element.classList.remove(cls);
        }
    }

    // Add back only where needed.
    for (const query in _queryToClasses) {
        const classes = _queryToClasses[query];
        const elements = _layoutParentDOM.querySelectorAll(query);
        for (const element of elements) {
            for (const className of classes) {
                element.classList.add(className);
            }
        }
    }

    // This to complicated to use above
    // // Get all divs with class lm_tab
    // const tabDivs = layoutParentDOM.querySelectorAll(".lm_tab");
    // for (const tabDiv of tabDivs) {
    //     // Does it have a child with class lm_close_tab?
    //     const closeTab = tabDiv.querySelector(".lm_close_tab");
    //     if (!closeTab) {
    //         // Does't have it. So add class reduced-padding-on-right
    //         tabDiv.classList.add("reduced-padding-on-right");
    //     }
    // }
}

// private resetBootstrapClasses(layoutParentDOM: HTMLElement) {
//     // Reset everything
//     let classesToRemove = [
//       "nav",
//       "nav-tabs",
//       "nav-item",
//       "active",
//       "nav-link",
//       "tab-content",
//     ];
//     for (const className of classesToRemove) {
//       let elements = layoutParentDOM.querySelectorAll(`.${className}`);
//       for (const el of elements) {
//         el.classList.remove(className);
//       }
//     }

//     let rolesToRemove = [
//       "tablist",
//       "presentation",
//       "tab",
//       "tabpanel",
//       "tab-pane",
//     ];
//     for (const role of rolesToRemove) {
//       let elements = layoutParentDOM.querySelectorAll(`[role="${role}"]`);
//       for (const el of elements) {
//         el.removeAttribute("role");
//       }
//     }

//     let dataAttributesToRemove = ["data-bs-toggle", "data-bs-target"];
//     for (const dataAttr of dataAttributesToRemove) {
//       let elements = layoutParentDOM.querySelectorAll(`[${dataAttr}]`);
//       for (const el of elements) {
//         el.removeAttribute(dataAttr);
//       }
//     }

//     let ariaToRemove = ["aria-controls", "aria-selected", "aria-labelledby"];
//     for (const ariaAttr of ariaToRemove) {
//       let elements = layoutParentDOM.querySelectorAll(`[${ariaAttr}]`);
//       for (const el of elements) {
//         el.removeAttribute(ariaAttr);
//       }
//     }
//   }

//   private makeGoldenLayoutBootstrapCompatible() {
//     // Add classes to make it work with bootstrap
//     let layoutParentDOM = document.querySelectorAll(".lm_goldenlayout")[0];
//     // this.resetBootstrapClasses(layoutParentDOM as HTMLElement);

//     layoutParentDOM.querySelectorAll(".lm_tabs").forEach((el: Element) => {
//       el.classList.add("nav");
//       el.classList.add("nav-tabs");
//       el.setAttribute("role", "tablist");
//     });

//     layoutParentDOM.querySelectorAll(".lm_tab").forEach((el: Element) => {
//       el.classList.add("nav-item");
//       el.setAttribute("role", "presentation");
//     });

//     layoutParentDOM
//       .querySelectorAll(".lm_tab.lm_active .lm_title")
//       .forEach((el: Element) => {
//         el.classList.add("active");
//       });

//     layoutParentDOM.querySelectorAll(".lm_title").forEach((el: Element) => {
//       let id = slugify((el as HTMLElement).innerText);

//       el.classList.add("nav-link");
//       el.setAttribute("data-bs-toggle", "tab");
//       el.setAttribute("data-bs-target", "#" + id);
//       el.setAttribute("role", "tab");
//       el.setAttribute("aria-controls", id);
//       // el.setAttribute("aria-selected", "true");
//     });

//     layoutParentDOM.querySelectorAll(".lm_content").forEach((el: Element) => {
//       el.classList.add("tab-content");
//       el.setAttribute("role", "tabpanel");
//       el.setAttribute("aria-labelledby", "home-tab");
//     });

//     // document
//     //   .querySelectorAll(".golden-layout-container")
//     //   .forEach((el: HTMLElement) => {
//     //     el.classList.add("container");
//     //   });
//   }
