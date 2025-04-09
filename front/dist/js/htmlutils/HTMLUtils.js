import {Fetcher} from '../fetchers/Fetcher.js';
import { router } from '../Router.js';

export class HTMLUtils {
    constructor(){
    }
    
    static redirect(path){
        console.log('redirecting to ', path);
        
        if (path === window.location.hash) { // window.location.pathname  
            return;
        }
        window.location.hash = path;
    }

    createLamdbasIntoContainer(container, lambdas, containerBalise){
        for (let lambda of lambdas){
            container.appendChild(this.createLambdaInto(containerBalise, lambda));
        }
        return container;
    }

    createLambdaInto(containerBalise, lambda){
        const container = document.createElement(containerBalise);
        container.appendChild(lambda());
        return container;
    }

    createLambdaIntoTd(lambda){
        return this.createLambdaInto('td', lambda);
    }

    createLambdaIntoDiv(lambda){
        return this.createLambdaInto('div', lambda);
    }
    

    createRef(name, lambda) {
        const ref = document.createElement('a');
        ref.href = '#';
        ref.textContent = name;
        ref.onclick = lambda;
        console.log('ref', ref);
        return ref;
    }
    
    createImg(src, alt, width, height){
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.width = width;
        img.height = height;
        return img;
    }
    
    createButton(key, lambdaAction){
        const actionButton = document.createElement('button');
        actionButton.textContent = key;
        actionButton.className = 'btn btn-tron';
        actionButton.onclick = () => {
            (async () => {
                const response = lambdaAction();
                console.log('response', response);
                router.rerenderCurrentRoute();
            })();
        };
        return actionButton;
    }
    


    createActionsButtons(containerBalise, actions){
        const actionsButtonContainer = document.createElement(containerBalise);
        actionsButtonContainer.classList.add('button-back-container');
        for (let action in actions) {
            actionsButtonContainer.appendChild(this.createButton(action, async () => {
                const rsp = await new Fetcher().fetchDoAction(actions[action]);
                router.rerenderCurrentRoute();
                return rsp;
            }));
        }
        if (actions.hasOwnProperty('block')) {
            actionsButtonContainer.appendChild(this.createButton('chalenge', async () => {
                console.log('chalenge');
                const rsp = await new Fetcher().fetchDoAction('/api/events/events/invite/' + this.user.id);
                router.rerenderCurrentRoute();
                return rsp;
            }));
            // Your code to handle 'block' key
        }
        return actionsButtonContainer;
    }
}