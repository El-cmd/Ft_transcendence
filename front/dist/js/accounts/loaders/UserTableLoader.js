import { AccountBasicLoader } from './AccountBasicLoader.js';
import { AccountFetcher } from '../AccountFetcher.js';
import { UserTable } from '../html_utils.js';

export class UserTableLoader extends AccountBasicLoader {
    constructor(params, placeholdername = 'main-content') {
        super('user_table.html', params, placeholdername);
    }


    afterRender() {
        const data = this.data;
        const userTable = new UserTable(data).table;
        console.log('user table data', data);
    
    }

    async fetchData() {
        return new AccountFetcher().fetchAllUsers();
    }
}
