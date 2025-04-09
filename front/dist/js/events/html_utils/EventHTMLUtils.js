import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";

export class EventHTMLUtils extends HTMLUtils {

    constructor(event) {
        super();
        this.event = event;
    }

    eventRef = () => {
        return this.createRef(this.event.name, () => {
            HTMLUtils.redirect(`#event/:${this.event.id}`);
            return false;
        });
    };

    createActionButtons(containerBalise) {
        return this.createActionsButtons(containerBalise, this.event.actions);
    }
}
