import { isLoggedIn } from "../accounts/utils.js";

export class OptionsMaker {
    constructor(options) {
        this.options = options ? options : {};
        this.options.headers = !!this.options.headers ? this.options.headers : {};
        if (isLoggedIn()) {
            this.options.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
        }
        this.options.headers['Accept'] = 'application/json';
        // this.options.credentials = 'include';  // Add this line to include credentials (ie ensure cookies are sent with request)
    }

    post(data, methode='POST') {
        console.log('data', data);
        this.options.headers['Content-Type'] = 'application/json';
        this.options.method = methode;
        this.options.body = JSON.stringify(data);
        console.log('options', this.options);
        return this.options;
    }

    patch(data) {
        return this.post(data, 'PATCH');
    }


    refresh() {
        return this.post({ refresh: localStorage.getItem('refreshToken') });
    }
}


