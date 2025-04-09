
import { AccountFetcher } from '../AccountFetcher.js';
import { Profile } from '../html_utils.js';
import { AccountBasicLoader } from './AccountBasicLoader.js';

export class ProfileLoader extends AccountBasicLoader {
    constructor(params) {
        super('account.html', params);

    }

    async fetchData() {
        console.log('fetching profile data', this.params);
        let id = this.params.id;
        // remove :
        id = id.substring(1);
        return new AccountFetcher().fetchProfile(id);
    }

    afterRender() {
        const data = this.data;
        const profil = new Profile(data);
        if  (Object.keys(data.actions).length == 0) {
            profil.addMyProfileActions();
        }
    }
}
