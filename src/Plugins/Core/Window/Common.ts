import { goldenLayout } from "@/UI/Layout/GoldenLayout/GoldenLayoutCommon";

export function switchToGoldenLayoutPanel(componentTitle: string) {
    // See https://github.com/golden-layout/golden-layout/issues/430

    let contentItem: any;
    const gl = goldenLayout as any;
    for (let i = 0; i < gl.getAllContentItems().length; i++) {
        if (gl.getAllContentItems()[i].title === componentTitle) {
            contentItem = gl.getAllContentItems()[i];
            contentItem.parent.setActiveContentItem(contentItem);
            break;
        }
    }

    if (contentItem === undefined) {
        // Not found.
        return;
    }

    // Now flash that panel to get the user's attention.
    let val = 10;
    const updateColor = () => {
        const bgColor = `rgb(${val}, ${val}, ${val}, 0.05)`;
        // console.log(bgColor);
        contentItem.element.style.backgroundColor = bgColor;
        val *= 1.25;
        val = Math.round(val);
        if (val < 245) {
            setTimeout(() => {
                // console.log("moo", val);
                updateColor();
            }, 25);
        } else {
            contentItem.element.style.backgroundColor = "";
        }
    }
    updateColor();

    // setTimeout(() => {
    //     contentItem.element.style.backgroundColor = "";
    // }, 1000);
}
