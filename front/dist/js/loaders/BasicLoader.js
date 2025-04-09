
const htmlPartialDir = 'partials/';


export class BasicLoader {
    
    constructor(partialPath, params, placeholdername='main-content') {
        this.params = params;
        this.partialPath = htmlPartialDir + partialPath; // path to html file for this section
        console.log('BasicLoader path : ', partialPath);
        this.placeholdername = placeholdername;
    }
    
    async fetch() {
        try {
            const response = await this.fetchData();
            console.log('Response : ', response);
            this.response = response;
            
            // Vu00e9rifier si la ru00e9ponse est du00e9ju00e0 un objet JavaScript (ru00e9ponse traitée par fetchData)
            if (response && !response.json && typeof response === 'object') {
                this.data = response;
                console.log('Data already processed:', this.data);
                return;
            }
            
            // Vu00e9rifier si c'est une ru00e9ponse HTTP
            if (this.response.status === 204) {
                console.log('No content to load');
                return;
            }
            
            // Si c'est un objet Response standard, traiter le JSON
            if (response && typeof response.json === 'function') {
                const data = await response.json();
                this.data = data;
                console.log('Data fetched : ', data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
    
    async getHtml() {
        console.log('In getHtml, fetching ' + this.partialPath);
        // S'assurer que le chemin commence par '/' pour que ça marche avec HTTPS
        const pathToFetch = this.partialPath.startsWith('/') ? this.partialPath : '/' + this.partialPath;
        console.log('Path to fetch: ' + pathToFetch);
        const response = await fetch(pathToFetch);
        if (response.ok) {
            console.log('Fetched ' + pathToFetch + ' successfully');
            const data = await response.text();
            console.log(pathToFetch + ' : loaded');
            return data;
        } else {
            console.error('Failed to fetch ' + pathToFetch + ', status: ' + response.status);
            // Fallback: essayer sans le slash initial si ça a échoué avec un slash
            if (pathToFetch.startsWith('/')) {
                console.log('Trying fallback without leading slash');
                const fallbackResponse = await fetch(this.partialPath);
                if (fallbackResponse.ok) {
                    console.log('Fallback fetch successful');
                    const fallbackData = await fallbackResponse.text();
                    return fallbackData;
                }
            }
            throw new Error('Failed to fetch HTML template: ' + pathToFetch);
        }
    }


    async load() {
        console.log('Loading view with path: ' + this.partialPath);
        
        // getting data from the server => override fetchData() in subclasses to perform fetch
        // if (this.fetchData) {
        //     await this.fetch().catch((error) => {
        //         console.error('Error fetching data : ', error);
        //         throw error;
        //     });
        // }

        // getting data from the server => override fetchData() in subclasses to perform fetch
        if (this.fetchData) {
            try {
                await this.fetch();
                console.log('API data fetched successfully');
            } catch (error) {
                console.error('Error fetching API data: ', error);
                // Ne pas bloquer le chargement de la page en cas d'erreur d'API
                // On continue avec les données par défaut ou vides
                this.data = this.data || { events: [] };
            }
        }

        try {
            // loading the html content
            console.log('Loading HTML template: ' + this.partialPath);
            const html = await this.getHtml();
            console.log('HTML template loaded successfully');
            document.getElementById('main-content').innerHTML = html;

            // calling afterRender function if it exists
            if (this.afterRender) {
                console.log('Calling afterRender');
                this.afterRender();
            }
        } catch (htmlError) {
            console.error('Error loading HTML template: ', htmlError);
            // Afficher une page d'erreur basique en dernier recours
            document.getElementById('main-content').innerHTML = `
                <div style="text-align: center; margin-top: 50px;">
                    <h2>Erreur de chargement</h2>
                    <p>Impossible de charger la page demandée.</p>
                </div>
            `;
        }
    }
}
