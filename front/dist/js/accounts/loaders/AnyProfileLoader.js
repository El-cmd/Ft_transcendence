import { ProfileLoader } from './ProfileLoader.js';

export class AnyProfileLoader extends ProfileLoader {
    constructor(params) {
        super(params);
        this.profile_id = params["profile_id"];
    }

    async fetchData() {
        return new AccountFetcher().fetchProfile(this.profile_id);
    }
}
