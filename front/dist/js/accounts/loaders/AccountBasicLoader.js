import { BasicLoader } from './../../loaders/BasicLoader.js';

export class AccountBasicLoader extends BasicLoader {
    constructor(partialPath, params) {
        super('accounts/' + partialPath, params);
    }
}
