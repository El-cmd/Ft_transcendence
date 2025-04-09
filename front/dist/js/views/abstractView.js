import { BasicLoader  }  from '../loaders/BasicLoader.js';

export  class abstractView extends BasicLoader  {
    constructor(partialPath, params) { // params such as chatroom or user ids
        super(partialPath, params);
        console.log("Params:", this.params); 
        console.log("Will fetch:", this.partialPath);
    }

    setTitle(title) { // title displayed on the tab in the browser
        document.title = title;
    }

    async authentifiedFetch(url) {
        const token = localStorage.getItem('accessToken');
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
             }
        };
        console.log('Fetching ', url);
        return fetch(url, options);
    }
}
