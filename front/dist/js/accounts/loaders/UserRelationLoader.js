import { UserTableLoader } from './UserTableLoader.js';
import { AccountFetcher } from '../AccountFetcher.js';

export class UserRelationLoader extends UserTableLoader {
    constructor( params) {
        super( params);
        this.rel_type = params["rel_type"];
        this.rel_type = this.rel_type.replace(":", ""); 
    }

    async fetchData() {
        return new AccountFetcher().fetchRelation(this.rel_type);
    }
}