import { ProfileLoader } from './ProfileLoader.js';
import { AccountFetcher } from '../AccountFetcher.js';
import { isLoggedIn } from '../utils.js';

export class MyProfileLoader extends ProfileLoader {
    async fetchData() {
        
        return new AccountFetcher().fetchMyProfile();
    }
    
    // afterRender() {
    //     super.afterRender();
    //     const data = this.data;
    //     const editButton = document.getElementById('edit-profile-btn');
    //     editButton.addEventListener('click', () => {
    //         window.location.hash = '#/edit-profile';
    //     });
    // }
}
