import {BasicLoader} from './BasicLoader.js';

// const accountSectionDir = 'accounts/';
export class ErrorLoader extends BasicLoader {
    constructor(params, text_error) {
        super('error.html', params);
        if (!!text_error){
            this.error_message = text_error;
        }
    }

    async load() {
        await super.load();
        if (!!this.error_message) {
            document.getElementById('error-message').textContent = this.error_message;
        }
    }
}
