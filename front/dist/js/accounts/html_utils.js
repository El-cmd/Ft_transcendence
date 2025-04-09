import { Fetcher } from "../fetchers/Fetcher.js";
import { handleLogout } from "./utils.js";
import { HTMLUtils } from "../htmlutils/HTMLUtils.js";

class UserHTMLUtils extends HTMLUtils { 
    constructor(user){
        super();
        this.user = user;
    }

    profileRef = () => {
        return this.createRef(this.user.username, () => {
            HTMLUtils.redirect(`#profiles/:${this.user.id}`);
            return false;
        });
    }
    

    avatarImg = (width=50, height=50) => {
        // Utiliser avatar_url en prioritu00e9 s'il est disponible (pour les profils 42)
        // sinon fallback sur avatar
        let imgUrl = this.user.avatar_url || this.user.avatar;
        console.log('Avatar URL:', imgUrl); // Pour du00e9boguer
        return this.createImg(`${imgUrl}`, `${this.user.username}'s avatar`, width, height);
    }
    createActionsButtonContainer(containerBalise){
        return this.createActionsButtons(containerBalise, this.user.actions);
    }
}

class UserRow extends UserHTMLUtils {
    constructor(user){
        super(user);
        this.container = document.createElement('tr');
        const lambdas = [];
        lambdas.push(() => {
            const eloContainer = document.createElement('td');
            eloContainer.textContent = this.user.elo;
            return eloContainer;
        })
        lambdas.push(()=> {
                const img = this.avatarImg()
                const imgConatainer = document.createElement('td');
                imgConatainer.appendChild(img);
                return imgConatainer;
            } 
        );
        lambdas.push(() => {
            this.profileRef();
            const refContainer = document.createElement('td');
            refContainer.appendChild(this.profileRef());
            return refContainer;
        } );
        lambdas.push(() => {
            return this.createActionsButtonContainer('td');
        });
        for (let lambda of lambdas) {
            this.container.appendChild(lambda());
        }
    }

    get userRow(){
        return this.container;
    }
}


class RelationsButtons extends HTMLUtils{
    constructor(buttonContainerBalise){
        super();
        this.relations = ['friends', 'blockeds', 'received_request', 'requested'];
        this.buttonContainer = document.createElement(buttonContainerBalise);

        for (let relation of this.relations) {
            this.buttonContainer.appendChild(this.createButton(`Show ${relation}`, () => {
                HTMLUtils.redirect(`#relation/:${relation}`);
            }));
        }
        this.buttonContainer.appendChild(this.createButton('Show all', () => {
            HTMLUtils.redirect('#ranking');
        }));
    }

    get buttons(){
        return this.buttonContainer;
    }
}

export class UserTable extends HTMLUtils {
    constructor(data){
        super();
        this.data = data;
        
        this.userTable = document.getElementById('rankingTable').getElementsByTagName('tbody')[0];
        this.userTable.innerHTML = '';
        for (let user of this.data) {
            this.userTable.appendChild(new UserRow(user).userRow);
            console.log('user', user);
        }
        this.addRelationsButtons();
    }

    get table(){
        return this.userTable;
    }

    addRelationsButtons(){
        const userTableElement = document.getElementById('rankingTable');
        if (userTableElement) {
            const tfoot = document.createElement('tfoot');
            const td = document.createElement('td');
            if (this.userTable.rows.length === 0){
                document.getElementById('main-content').innerHTML = '';
                const noUsersMessage = document.createElement('h2');
                noUsersMessage.textContent = 'No users found for this category';
                document.getElementById('main-content').appendChild(noUsersMessage);
                document.getElementById('main-content').appendChild(new RelationsButtons('div').buttons); 
                return;
            }
            td.colSpan = this.userTable.rows[0].cells.length;
            td.appendChild(new RelationsButtons('div').buttons);
            tfoot.appendChild(td);
            userTableElement.appendChild(tfoot);
            
        }
    }
}

export class Profile extends UserHTMLUtils {
    constructor(data){
        super(data);
        this.profile = document.getElementById('up-profile-container');
        this.profile.innerHTML = '';
        const lambdas = [];
        lambdas.push(() => {return this.avatarImg(100, 100)});
        lambdas.push(() => {return this.profileRef()});
        lambdas.push(() => {return document.createTextNode(this.user.bio)});
        lambdas.push(() => {return this.createActionsButtonContainer('span')});
        this.createLamdbasIntoContainer(this.profile, lambdas, 'span');
    }

    logoutButton = () => {
        return this.createButton('Logout', () => {
            return handleLogout();
        });
    }

    editProfileButton = () => {
        return this.createButton('Edit profile', () => {
            HTMLUtils.redirect('#/edit');
            return false;
        });
    }

    addMyProfileActions(){
        
        const buttonContainer = document.createElement('div');
        buttonContainer.appendChild(this.logoutButton());
        buttonContainer.appendChild(this.editProfileButton());
        this.profile.appendChild(buttonContainer);
    }
}