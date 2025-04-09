import { HTMLUtils } from "../../htmlutils/HTMLUtils.js";

export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hourCycle: 'h23'
    });
}

export class ChatComponent extends HTMLUtils
{
    constructor() {
        super();
        this.templates = {
            userAction: (action) => `
                <button type="button" class="btn btn-outline-secondary" data-action="${action.type}">
                    <i class="bi ${this.getActionIcon(action.type)}"></i> ${action.label}
                </button>
            `,
            conversationItem: (conversation) => `
                <li class="list-group-item conversation-item d-flex align-items-center" data-conversation-id="${conversation.other_profile.id}">
                    <img src="${conversation.other_profile.avatar_url || conversation.other_profile.avatar}" class="rounded-circle me-2" width="32" height="32" alt="">
                    <div class="flex-grow-1 d-flex flex-column">
                        <div class="d-flex align-items-center">
                            <h6 class="mb-0 me-2">${conversation.other_profile.username}</h6>
                            ${conversation.other_profile.relation == 'FRIEND'  
                                ? `<span class="badge ${conversation.other_profile.online_status.status == 'online' ? 'bg-success' : 'bg-secondary'}">
                                    ${conversation.other_profile.online_status.status == 'online' ? 'Online' : 'Offline'}
                                </span>` 
                                : ''
                            }
                        </div>
                        <small class="text-muted"> 
                            ${conversation.last_message 
                                ? `<b>${conversation.last_message.sender === conversation.other_profile.id ? conversation.other_profile.username : 'me'}</b> ${conversation.last_message.content || ''}` 
                                : '<i>No messages yet</i>'}
                        </small>
                    </div>
                    ${conversation.unread_count ? `<span class="badge bg-primary rounded-pill">${conversation.unread_count}</span>` : ''}
                </li>
            `,
            message: (message, isOwn) => `
                <div class="message-wrapper ${isOwn ? 'own-message text-end' : 'other-message'} mb-3">
                    <div class="message d-inline-block ${isOwn ? 'bg-primary text-white' : 'bg-light'} p-2 rounded-3 mw-75">
                        ${message.content}
                        <small class=z"d-block text-${isOwn ? 'light' : 'muted'} mt-1">${formatTimestamp(message.timestamp)}</small>
                    </div>
                </div>
            `,
            gameInvite: (isOwn) => `
                <div class="message-wrapper ${isOwn ? 'own-message text-end' : 'other-message'} mb-3">
                    <div class="message d-inline-block ${isOwn ? 'bg-primary text-white' : 'bg-light'} p-2 rounded-3 mw-75">
                        ${isOwn 
                        ?   `<span class="text-muted">Game invite sent.</span>`
                        :   `<a href="#/accessible-events" class="d-block text-decoration-none game-invite-message p-2 rounded-3">
                            <b>Game Invite!</b> Click to view. </a>`}
                    </div>
                </div>
            `
        };
    }

    getActionIcon(type) {
        const icons = {
            'view-profile': 'bi-person',
            'block': 'bi-slash-circle',
            'unblock': 'bi-check-circle',
            'invite-game': 'bi-controller',
            'unfriend': 'bi-person-x',
            'create_request': 'bi-person-plus'
        };
        return icons[type] || 'bi-three-dots';
    }

    renderConversationHeader(user, actions) {

        console.log('rendering conversation header');

        const header = document.getElementById('conversation-header');
        if (!header) return;

        const avatar = header.querySelector('#chat-user-avatar');
        const username = header.querySelector('#chat-user-name');
        const actionsContainer = header.querySelector('#user-actions');

        if (avatar) avatar.src = user.avatar_url || user.avatar;
        if (username) {
            username.innerHTML = `
                ${user.username}
                
                ${user.relation == 'FRIEND'  
                    ? `<span class="badge ${user.online_status.status == 'online' ? 'bg-success' : 'bg-secondary'}">
                        ${user.online_status.status == 'online' ? 'Online' : 'Offline'}
                    </span>` 
                    : ''
                }
            `;
        }
        if (actionsContainer) {
            actionsContainer.innerHTML = actions
                .map(action => this.templates.userAction(action))
                .join('');
        }
    }

    // Updates the current conversation's actions container in the header. 
    // Called after having performed an action 
    updateActionsContainer(actions) {
        const actionsContainer = document.getElementById('user-actions');
        if (!actionsContainer) return;

        actionsContainer.innerHTML = actions
            .map(action => this.templates.userAction(action))
            .join('');
    }

    renderStatusBadge(statusBadge, status) {
        if (!statusBadge) return;

         // Update the badge color and text based on the status
        if (status === 'online') {
            statusBadge.classList.remove('bg-secondary');
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'Online';
        } else {
            statusBadge.classList.remove('bg-success');
            statusBadge.classList.add('bg-secondary');
            statusBadge.textContent = 'Offline';
        }
    }

    renderHeaderOnlineStatus(payload) {
        const statusBadge = document.getElementById('chat-user-status');
        if (!statusBadge) return;

        this.renderStatusBadge(statusBadge, payload.status);
    }

    renderSidebarOnlineStatus(user) {
        console.log('rendering sidebar online status for user ', user.username);
        const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${user.id}"]`);
        if (!conversationItem) return;

        if (user.relation !== 'FRIEND') {
            console.log('User is not a friend, not updating status');
            const existingBadge = conversationItem.querySelector('.badge');
            if (existingBadge) existingBadge.remove(); // Remove badge if user is not a friend
            return;
        }

        let statusBadge = conversationItem.querySelector('.badge');
        if (!statusBadge) {
            statusBadge = document.createElement('span');
            statusBadge.classList.add('badge');
            const nameElement = conversationItem.querySelector('h6');
            if (nameElement) nameElement.insertAdjacentElement('afterend', statusBadge);
        }

        this.renderStatusBadge(statusBadge, user.online_status.status);
    }


    updateConvoLastMessage(convo, payload) {
        const conversationItem = document.querySelector(`.conversation-item[data-conversation-id="${convo.other_profile.id}"]`);
        if (!conversationItem) {
            console.error('Conversation with', convo.other_profile.username,' not found');
            return ;
        }

        // Find the <small> element containing the last message
        const lastMessageElement = conversationItem.querySelector('small.text-muted');
        if (!lastMessageElement) {
            console.error('Last message element not found.');
            return;
        }

        // Update the last message content
        lastMessageElement.innerHTML = `<b>${payload.sender === convo.other_profile.id ? convo.other_profile.username : 'me'}</b> ${payload.content || ''}`;

    }

    renderConversationList(conversations) {
        const container = document.getElementById('chat-conversations');
        if (!container) return;

        console.log('Rendering conversation list. Existing conversations : ', conversations);

        if (!conversations || conversations.length === 0) {
            container.innerHTML = '<li class="conversations-message">Pas de conversations pour le moment</li>';
            return;
        }

        // container.innerHTML = ''; // ?
        container.innerHTML = conversations
            .map(conv => this.templates.conversationItem(conv))
            .join('');

        // Add click handlers
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class from all items
                container.querySelectorAll('.conversation-item').forEach(i => 
                    i.classList.remove('active'));
                // Add active class to clicked item
                item.classList.add('active');
                // Dispatch custom event
                container.dispatchEvent(new CustomEvent('conversationSelected', {
                    detail: { conversationId: item.dataset.conversationId }
                }));
            });
        });
    }

    setActiveConversation(conversationId) {
        console.log('in setActiveConversation');
        const container = document.getElementById('chat-conversations');
        if (!container) return;
        console.log('conversationId = ', conversationId);

        container.querySelectorAll('.conversation-item').forEach(item => {
            // console.log('item.dataset.conversationId = ', item.dataset.conversationId);
            if (item.dataset.conversationId == conversationId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    renderMessages(messages, userId) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = '';

        if (!messages)
            return;

        container.innerHTML = messages
            .map(msg => msg.message_type === 'text' ? this.templates.message(msg, msg.sender === userId) : this.templates.gameInvite(msg.sender === userId))
            .join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    addMessage(message, userId) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        let messageHtml;
        if (message.message_type === 'text')
            messageHtml = this.templates.message(message, message.sender === userId);
        else 
            messageHtml = this.templates.gameInvite(message.sender === userId);
        container.insertAdjacentHTML('beforeend', messageHtml);
        container.scrollTop = container.scrollHeight;
    }

    addButton(callback) {
        const button = this.createButton('Invite', callback);

    }

    setupMessageForm(onSubmitCallback) {
        const form = document.getElementById('chat-form');
        const input = document.getElementById('chat-input-field');
        const messageWarning = document.getElementById('message-warning');
        
        if (!form || !input) return;

        // Ajouter la validation en temps réel du message
        input.addEventListener('input', (e) => {
            const message = e.target.value;
            
            // Vérifier les caractères autorisés (lettres, chiffres et caractères spéciaux communs)
            const allowedCharsRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]+$/;
            const hasInvalidChar = !allowedCharsRegex.test(message);
            
            // Vérifier la longueur
            const isNearMaxLength = message.length >= 1990; // Près de la limite de 2000 caractères
            
            if (messageWarning) {
                if (hasInvalidChar) {
                    messageWarning.textContent = "Caractère non autorisé détecté.";
                    messageWarning.style.display = 'block';
                    messageWarning.style.color = 'red';
                } else if (isNearMaxLength) {
                    messageWarning.textContent = "Attention: Vous approchez de la limite de 2000 caractères!";
                    messageWarning.style.display = 'block';
                    messageWarning.style.color = 'orange';
                } else {
                    messageWarning.style.display = 'none';
                }
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = input.value.trim();
            
            // Vérification du message avant soumission
            const allowedCharsRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]+$/;
            const hasInvalidChar = !allowedCharsRegex.test(message);
            
            if (message && !hasInvalidChar) {
                onSubmitCallback(message);
                input.value = '';
                if (messageWarning) {
                    messageWarning.style.display = 'none';
                }
            } else if (hasInvalidChar && messageWarning) {
                messageWarning.textContent = "Caractère non autorisé détecté. Impossible d'envoyer ce message.";
                messageWarning.style.display = 'block';
                messageWarning.style.color = 'red';
            }
        });
    }

    setupSearchBar(onSearchCallback) {
        const input = document.getElementById('userSearchInput');
        const results = document.getElementById('searchResults');
        
        if (!input || !results) return;

        let debounceTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const term = e.target.value.trim();
                if (term.length >= 2) {
                    onSearchCallback(term);
                } else {
                    results.innerHTML = '';
                }
            }, 300);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.innerHTML = '';
            }
        });

        // Re show results when clicking back on it
        input.addEventListener('focus', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const term = e.target.value.trim();
                if (term.length >= 2) {
                    onSearchCallback(term);
                } else {
                    results.innerHTML = '';
                }
            }, 300);
        })
    }
}
