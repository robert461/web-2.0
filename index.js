(function () {

    var peerJsHost = "";
    var peerJsPort = "9000";
    var peerJsPath = "/myapp";

    var lastPeerId = null;
    var peer = null; // own peer object
    var connection = null;

    var connectedToIdInput = document.getElementById('connected-to-id-input');
    var connectionIdInput = document.getElementById('connection-id-input');

    var newIdButton = document.getElementById('new-id-button');
    var submitNewPeerIdButton = document.getElementById('submit-new-peer-id-button');
    var statusButton = document.getElementById('status-button');
    var acceptIncomingConnectionButton = document.getElementById('accept-incoming-connection-button');
    var declineIncomingConnectionButton = document.getElementById('decline-incoming-connection-button');
    var closeConnectionButton = document.getElementById('close-connection-button');
    var writeToLocalStorageButton = document.getElementById('write-local-storage-button');
    var syncToLocalStorageButton = document.getElementById('sync-local-storage-button');
    var charsIconsSwitchButton = document.getElementById('chars-icons-switch-button');
    var enterExistingIdButton = document.getElementById('enter-existing-id-button');
    var writeToIndexedDBButton = document.getElementById('write-indexedDB-button');
    var syncIndexedDBButton = document.getElementById('sync-indexed-db-button');
    var loadFromIndexedDBButton = document.getElementById('load-from-indexed-db-button');

    var newPeerIdModal = new bootstrap.Modal(document.getElementById('enterNewPeerIdModal'));
    var acceptIncomingConnectionModal = new bootstrap.Modal(document.getElementById('acceptIncomingConnectionModal'));

    var newPeerIdModalElement = document.getElementById('enterNewPeerIdModal');
    var acceptIncomingConnectionModalElement = document.getElementById('acceptIncomingConnectionModal');

    var acceptIncomingConnectionText = document.getElementById('accept-incoming-connection-text');
    var connectToastText = document.getElementById('connect-toast-text');
    var disconnectToastText = document.getElementById('disconnect-toast-text');
    var syncSuccessfullText = document.getElementById('sync-successfull-toast-text');
    var writeToStorage = document.getElementById('write-to-storage-toast-text');
    var idSpan = document.getElementById('id-span');

    var enterPeerIdModalContent = document.getElementById('enter-peer-id-modal-content');

    var toastElementList = [].slice.call(document.querySelectorAll('.toast'))
    var toastList = toastElementList.map(function (toastElement) {
        return new bootstrap.Toast(toastElement)
    })

    var peerIdFromUrl = '';

    var qrcode;
    var indexedDb;

    var unhandledIncomingConnections = [];
    var currentlyHandledConnection = undefined;

    var currentConnectionAccepted = false;

    var useCustomId = false;
    var customIdCharacters = [
        'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 
        't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
        'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', 
        '5', '6', '7', '8', '9'];
    var customIdIcons = [
        'ambulance', 'anchor', 'angry', 'apple-alt', 'beer', 'bell', 'bone', 'bread-slice', 'bus', 'car', 
        'car-side', 'cat', 'chess-knight', 'cocktail', 'coffee', 'crow', 'dizzy', 'dog', 'dove', 'dragon', 
        'feather', 'fish', 'flushed', 'frog', 'frown', 'gas-pump', 'ghost', 'grimace', 'grin', 'grin-beam', 
        'grin-squint', 'grin-squint-tears', 'grin-tears', 'grin-tongue', 'grin-tongue-wink', 'hamburger', 
        'hand-point-left', 'hand-point-right', 'handshake', 'heart', 'hippo', 'horse', 'ice-cream', 'kiss', 
        'kiwi-bird', 'laugh-wink', 'meh', 'meh-blank', 'meh-rolling-eyes', 'motorcycle', 'otter', 'paw', 
        'phone', 'pizza-slice', 'smile', 'spider', 'surprise', 'thumbs-down', 'thumbs-up', 'truck', 
        'wheelchair', 'wine-bottle']

    var enteredEmojiCharacters = '';

    function storeIDinIndexedDB(db, message){
        var transaction = db.transaction(['idStorage'], 'readwrite');
        var storage = transaction.objectStore('idStorage');

        var id = {text: message, timestamp: Date.now()};
        storage.add(id);

        transaction.oncomplete = function(){
            toastList[3].hide();
            writeToStorage.innerHTML = `Wrote to indexed db.`;
            toastList[3].show();
        }
        
        transaction.onerror = function(){
            alert('Error while saving: ' + event.target.errorcode);
        }        
    }

    function storeReceivedDataInIndexedDb(db, data) {
        var transaction = db.transaction(['idStorage'], 'readwrite');
        var storage = transaction.objectStore('idStorage');

        data.forEach(d => {
            storage.add(d);
        });

        toastList[2].hide();
        syncSuccessfullText.innerHTML = `Synced indexed db with ${connection.peer}.`;
        toastList[2].show();

        sendSyncSuccessfullMessage(connection.connectionId);
    }

    function loadAllIds(db) {
    	var transaction = db.transaction(['idStorage'], 'readonly');
    	var storage = transaction.objectStore('idStorage');

    	var req = storage.openCursor();
    	var allMessages = [];

    	req.onsuccess = function(event) {
    		var cursor = event.target.result;

    		if (cursor != null) {
    			allMessages.push(cursor.value);
    			cursor.continue();
    		} else {
                sendDataMessage('indexedDb', allMessages);
    		}
    	}

    	req.onerror = function(event) {
    		alert('Error while loading messages: ' + event.target.errorCode);
    	}
    }

    function displayMessages(db){
        var transaction = db.transaction(['idStorage'], 'readonly');
    	var storage = transaction.objectStore('idStorage');

    	var req = storage.openCursor();
    	var allMessages = [];

    	req.onsuccess = function(event) {
    		var cursor = event.target.result;

    		if (cursor != null) {
    			allMessages.push(cursor.value);
    			cursor.continue();
    		} else {
                var listHTML = '<hr><span><b>Indexed DB:</b></span><ul>';
                for(var x = 0; x < allMessages.length; x++){
                    var id = allMessages[x];
                    listHTML += '<li> ID:' + id.text + ', Used on: ' +
                        new Date(id.timestamp).toString() + '</li>';
                }

                listHTML += '</ul>';
                listHTML += '<hr><span><b>local storage:</b></span><ul>';

                listHTML += '<li> ' + JSON.stringify(window.localStorage) + '</id>';
                listHTML += '</ul>';

                document.getElementById('messages').innerHTML = listHTML;
    		}
    	}

    	req.onerror = function(event) {
    		alert('Error while loading messages: ' + event.target.errorCode);
    	}
    }

    function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        peerIdFromUrl = urlParams.get('peer_id');
        const useCustomIdParameter = urlParams.get("use_custom_id");

        if (useCustomIdParameter) {
            useCustomId = useCustomIdParameter;
        }

        getNewPeer();
        addElementEventListeners();
        initQRCode();
        initIndexedDb();
    };

    function initIndexedDb() {
        if (!window.indexedDB) {
            alert("IndexedDB wird nicht unterstützt!");
        }    
        
        var request = indexedDB.open("pearShareDB", 1);
    
        request.onupgradeneeded = function(event){
            indexedDb = event.target.result;
    
            indexedDb.createObjectStore('idStorage', {autoIncrement: true});
        }
    
        request.onsuccess = function(event){
            indexedDb = event.target.result;
        }
    
        request.onerror = function(event){
            alert('Error while connecting to IndexedDB: ' + event.target.errorCode);
        }
    }

    function handleUrlQueryParams() {
        
        if (peerIdFromUrl !== null) {
            connectToExistingPeer(peerIdFromUrl);
            peerIdFromUrl = null;
        }
    }

    function getNewPeer() {
        if (connection !== null) {
            connection.close();
        }

        peer = new Peer({
            host: peerJsHost,
            port: peerJsPort,
            path: peerJsPath,
            debug: 2,
            useCustomId: useCustomId,
        });

        setPeerListeners(peer);
        setStatusToWaiting();

        currentConnectionAccepted = false;
    }

    function connectToExistingPeer(peerId) {
        setStatusToConnecting();

        if (connection) {
            connection.close();
        }

        connection = peer.connect(peerId, {
            reliable: true
        });

        currentConnectionAccepted = false;

        setConnectionListeners(connection);
    }

    function handleNextUnhandledConnection() {
        if (unhandledIncomingConnections.length > 0) {
            firstUnhandledConnecton = unhandledIncomingConnections.shift();

            showAcceptConnectionModal(firstUnhandledConnecton);
        }
    }

    function showAcceptConnectionModal(newConnection) {
        currentConnectionAccepted = false;

        if (currentlyHandledConnection && connection !== currentlyHandledConnection && currentlyHandledConnection.open) {
            currentlyHandledConnection.close();
        }

        currentlyHandledConnection = newConnection;

        acceptIncomingConnectionText.innerHTML = `Accept connection with <br>${getIdAsHtmlContent(newConnection.peer)}?`;
        acceptIncomingConnectionModal.show();
    }

    function setPeerListeners(peer) {
        peer.on('open', function (id) {
            // Workaround for peer.reconnect deleting previous id
            if (peer.id === null) {
                console.log('Received null id from peer open');
                peer.id = lastPeerId;
            } else {
                lastPeerId = peer.id;
            }

            idSpan.innerHTML = getIdAsHtmlContent(peer.id);
            generateQRCode();
            handleUrlQueryParams();
        });

        peer.on('connection', function (newConnection) {

            if (newPeerIdModal._isShown || acceptIncomingConnectionModal._isShown) {
                unhandledIncomingConnections.push(newConnection);

            } else {

                showAcceptConnectionModal(newConnection);
            }
        });

        peer.on('close', function() {
            alert('Peer close unhandled')
            connection = null;
            setStatusToWaiting();
        });

        peer.on('error', function (err) {
            console.log(err);
            alert('' + err);
        });
    }

    function setConnectionListeners(newConnection) {
        newConnection.on('data', function (message) {

            if (message.hasOwnProperty('messageType') && message.hasOwnProperty('connectionId')) {

                if (!currentConnectionAccepted) {

                    if (message.messageType === 'accept' && message.connectionId === connection.connectionId) {
                        currentConnectionAccepted = true;
                        setStatusToConnected();

                        connectedToIdInput.value = `${connection.peer}`;
                        connectionIdInput.value = `${connection.connectionId}`;
                    }

                    if (message.messageType === 'decline' && message.connectionId === connection.connectionId) {
                        currentConnectionAccepted = false;
                        connection.close();
                        setStatusToDeclined();

                        handleNextUnhandledConnection();
                    }

                } else {
                    if (message.messageType === 'sync-success') {
                        toastList[2].hide();
                        syncSuccessfullText.innerHTML = `Successfully synced with ${connection.peer}.`;
                        toastList[2].show();
                    }

                    if (message.hasOwnProperty('data')) {
                        switch(message.messageType) {
                            case 'localStorage':
                                localStorageItems = JSON.parse(message.data);

                                for (var item in localStorageItems) {
                                    localStorage.setItem(`${item}`, localStorageItems[item]);
                                }

                                sendSyncSuccessfullMessage(connection.connectionId);

                                toastList[2].hide();
                                syncSuccessfullText.innerHTML = `Synced local storage with ${connection.peer}.`;
                                toastList[2].show();

                                break;

                            case 'indexedDb':
                                indexedDbItems = JSON.parse(message.data);

                                storeReceivedDataInIndexedDb(indexedDb, indexedDbItems);

                            default:
                                break;
                        }
                    }
                }
            }

        });

        newConnection.on('close', function () {
            toastList[1].hide();
            disconnectToastText.innerHTML = `Disconnected from ${connectedToIdInput.value}.`;
            toastList[1].show();

            connection = null;
            setStatusToWaiting();
            connectedToIdInput.value = "";
            connectionIdInput.value = "";

        });
    }

    function declineCurrentlyHandledConnection() {

        sendDeclineMessage(currentlyHandledConnection);

        handleNextUnhandledConnection();
    }

    function addElementEventListeners() {
        newIdButton.addEventListener('click', function () {
            getNewPeer();
        });

        submitNewPeerIdButton.addEventListener('click', function () {
            newPeerIdModal.hide();

            let peerId = '';

            if (useCustomId) {
                peerId = enteredEmojiCharacters;
            } else {
                const newPeerIdInput = document.getElementById('new-peer-id-input');
                peerId = newPeerIdInput.value;
            }

            connectToExistingPeer(peerId);
        });

        enterExistingIdButton.addEventListener('click', function () {

            if (useCustomId) {

                buildEmojiKeyboard();

            } else {
                const content = '<input type="text" class="form-control" id="new-peer-id-input" placeholder="00000000-0000-0000-0000-000000000000">';
                enterPeerIdModalContent.innerHTML = content;
            }

        });

        acceptIncomingConnectionButton.addEventListener('click', function () {
            currentConnectionAccepted = true;

            acceptIncomingConnectionModal.hide();

            if (connection) {
                connection.close();
            }

            connection = currentlyHandledConnection;

            setConnectionListeners(connection);

            sendAcceptMessage(connection.connectionId);

            connectedToIdInput.value = connection.peer;
            connectionIdInput.value = `${connection.connectionId}`;

            setStatusToConnected();
        });

        declineIncomingConnectionButton.addEventListener('click', function () {
            acceptIncomingConnectionModal.hide();
        });

        newPeerIdModalElement.addEventListener('hidden.bs.modal', function () {
            handleNextUnhandledConnection();
        });

        acceptIncomingConnectionModalElement.addEventListener('hidden.bs.modal', function () {
            if (!currentConnectionAccepted) {
                declineCurrentlyHandledConnection();
            }
        });

        closeConnectionButton.addEventListener('click', function () {
            if (connection) {
                connection.close();
                setStatusToWaiting();

                connectedToIdInput.value = "";
                connectionIdInput.value = "";
            }
        });

        writeToLocalStorageButton.addEventListener('click', function () {
            localStorage.setItem('Web 2.0', `Projekt ${Date.now()}`);
            localStorage.setItem('Lorem ipsum', `${Math.random()}`);

            toastList[3].hide();
            writeToStorage.innerHTML = `Wrote to local storage.`;
            toastList[3].show();
        });

        syncToLocalStorageButton.addEventListener('click', function () {
            if (connection && connection.open) {
                sendDataMessage('localStorage', window.localStorage);
            }
        });

        charsIconsSwitchButton.addEventListener('click', function () {
            useCustomId = !useCustomId;

            getNewPeer();
        });

        writeToIndexedDBButton.addEventListener('click', function () {
            var message = document.getElementById('connected-to-id-input');
            storeIDinIndexedDB(indexedDb, message.value);
            message.value = '';
        });

        syncIndexedDBButton.addEventListener('click', function () {
            if (connection && connection.open) {
                loadAllIds(indexedDb);
            }
        });

        var allIDsHidden = true;
        loadFromIndexedDBButton.addEventListener('click', function () {
            if(allIDsHidden){
                displayMessages(indexedDb);
                loadFromIndexedDBButton.firstChild.data = "Hide saved IDs";
                allIDsHidden = false;
            }
            else{
                document.getElementById('messages').innerHTML = '';
                loadFromIndexedDBButton.firstChild.data = "Show saved IDs";
                allIDsHidden = true;
            }
        });
    }

    function buildEmojiKeyboard() {
        let content = '';

        content += '\
            <div class="card">\
                <div class="card-body">\
                    <span class="card-text" id="entered-id-span"></span>\
                </div>\
            </div>';

        content += '<div class="row row-cols-5">';

        customIdCharacters.forEach(c => {
            content += '<div class="col">';
            content += '<button type="button" class="btn btn-secondary my-1" name="emojiKeyboardButton" style="width: 5rem">';
            content += getIconFromCharacter(c);
            content += '</button>';
            content += '</div>'
        });

        content += '</div>';

        enteredEmojiCharacters = '';

        enterPeerIdModalContent.innerHTML = content;

        const enteredIdSpan = document.getElementById('entered-id-span');
        enteredIdSpan.innerHTML = " ";

        const keyboardButtons = document.getElementsByName('emojiKeyboardButton');

        keyboardButtons.forEach(kb => {

            const character = kb.children[0].attributes.getNamedItem('char').nodeValue;

            kb.addEventListener('click', function () {
                enteredEmojiCharacters += character;

                enteredIdSpan.innerHTML = getIdAsHtmlContent(enteredEmojiCharacters);
            });
        });
    }

    function sendDataMessage(messageType, data) {
        dataString = JSON.stringify(data);

        const message = {messageType: messageType, connectionId: connection.connectionId, data: dataString}

        connection.send(message);
    }

    function sendAcceptMessage(connectionId) {

        const message = {messageType: 'accept', connectionId: connectionId}

        connection.send(message);
    }

    function sendDeclineMessage(currentConnection) {

        const message = {messageType: 'decline', connectionId: currentConnection.connectionId}

        currentConnection.send(message);
    }

    function sendSyncSuccessfullMessage(connectionId) {

        const message = {messageType: 'sync-success', connectionId: connectionId}

        connection.send(message);
    }

    function setStatusToWaiting() {
        setStatusButtonWarning();
        statusButton.innerHTML = 'Waiting';
    }

    function setStatusToConnecting() {
        setStatusButtonWarning();
        statusButton.innerHTML = 'Connecting';
    }

    function setStatusToConnected() {
        toastList[0].hide();
        connectToastText.innerHTML = `Connected to ${connection.peer}.`;
        toastList[0].show();

        handleNextUnhandledConnection();

        setStatusButtonSuccess();
        statusButton.innerHTML = 'Connected';
    }

    function setStatusToDeclined() {
        // TODO successfull connection > close > new connection > decline > status not displayed properly

        setStatusButtonDanger();
        statusButton.innerHTML = 'Declined';
    }

    function setStatusButtonSuccess() {
        if (statusButton.className.match(/(?:^|\s)btn-warning(?!\S)/)) {
            statusButton.classList.remove('btn-warning');
            statusButton.classList.add('btn-success');
        }

        if (statusButton.className.match(/(?:^|\s)btn-danger(?!\S)/)) {
            statusButton.classList.remove('btn-danger');
            statusButton.classList.add('btn-success');
        }
    }

    function setStatusButtonWarning() {
        if (statusButton.className.match(/(?:^|\s)btn-success(?!\S)/)) {
            statusButton.classList.remove('btn-success');
            statusButton.classList.add('btn-warning');
        }

        if (statusButton.className.match(/(?:^|\s)btn-danger(?!\S)/)) {
            statusButton.classList.remove('btn-danger');
            statusButton.classList.add('btn-warning');
        }
    }

    function setStatusButtonDanger() {
        if (statusButton.className.match(/(?:^|\s)btn-success(?!\S)/)) {
            statusButton.classList.remove('btn-danger');
            statusButton.classList.add('btn-danger');
        }

        if (statusButton.className.match(/(?:^|\s)btn-warning(?!\S)/)) {
            statusButton.classList.remove('btn-danger');
            statusButton.classList.add('btn-danger');
        }
    }
    function initQRCode() {
        qrcode = new QRCode(document.getElementById("qrcode"), {
            text: "",
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H,
        });
    }

    function generateQRCode() {
        const currentUrl = window.location.href.split('?')[0];
        qrcode.clear();
        qrcode.makeCode(currentUrl + '?peer_id=' + peer.id + '&use_custom_id=' + useCustomId);
    }

    function getIdAsHtmlContent(id) {

        if (useCustomId) {
            const characters = [...id];

            let icons = '';

            characters.forEach(c => {
                const icon = getIconFromCharacter(c);

                icons += icon;
            });

            return icons;
        }

        return `${peer.id}`;
    }

    function getIconFromCharacter(character) {
        const characterIndex = customIdCharacters.indexOf(character);

        var icon = `<i class="fas fa-${customIdIcons[characterIndex]} fa-2x px-2" char="${character}"></i>`;
        
        return icon;
    }

    initialize();
})();
