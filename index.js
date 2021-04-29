(function () {

    var peerJsHost = "ec2-18-195-162-139.eu-central-1.compute.amazonaws.com";
    var peerJsPort = "9000";
    var peerJsPath = "/myapp";
    var iceServer = "stun:stun.l.google.com:19302";

    var lastPeerId = null;
    var peer = null; // own peer object
    var connection = null;
    
    var idField = document.getElementById('peerjs-id-field');
    var newPeerIdInput = document.getElementById('new-peer-id-input');

    var newIdButton = document.getElementById('new-id-button');
    var submitNewPeerIdButton = document.getElementById('submit-new-peer-id-button');
    var statusButton = document.getElementById('status-button');
    var acceptIncomingConnectionButton = document.getElementById('accept-incoming-connection-button');
    var declineIncomingConnectionButton = document.getElementById('decline-incoming-connection-button');
    var closeConnectionButton = document.getElementById('close-connection-button');
    var writeToLocalStorageButton = document.getElementById('write-local-storage-button');
    var syncToLocalStorageButton = document.getElementById('sync-local-storage-button');

    var newPeerIdModal = new bootstrap.Modal(document.getElementById('enterNewPeerIdModal'));
    var acceptIncomingConnectionModal = new bootstrap.Modal(document.getElementById('acceptIncomingConnectionModal'));
    
    var newPeerIdModalElement = document.getElementById('enterNewPeerIdModal');
    var acceptIncomingConnectionModalElement = document.getElementById('acceptIncomingConnectionModal');

    var acceptIncomingConnectionText = document.getElementById('accept-incoming-connection-text');
    
    var unhandledIncomingConnections = [];
    var currentlyHandledConnection = undefined;

    var currentConnectionAccepted = false;


    function initialize() {

        getNewPeer();

        addElementEventListeners();
    };

    function getNewPeer() {
        if (connection !== null) {
            connection.close();
        }

        peer = new Peer({
            host: peerJsHost,
            port: peerJsPort,
            path: peerJsPath,
            config: {'iceServers': [
                { urls: iceServer }
            ]},
            debug: 2
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

        if (currentlyHandledConnection) {
            currentlyHandledConnection.close();
        }

        currentlyHandledConnection = newConnection;

        acceptIncomingConnectionText.innerHTML = `Accept connection with ${newConnection.peer}?`;
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

            idField.value = `${peer.id}`;
        });

        peer.on('connection', function (newConnection) {

            // TODO weird connection closing going on when new connection attempts are received while the accept modal is open

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
        newConnection.on('data', function (data) {

            if (!currentConnectionAccepted) {
                if (data === 'ACCEPT') {
                    currentConnectionAccepted = true;
                    setStatusToConnected();
                    idField.value = `${connection.peer}`;
                }

                if (data === 'DECLINE') {
                    currentConnectionAccepted = false;
                    connection.close();
                    setStatusToDeclined();
                    
                    handleNextUnhandledConnection();
                }
            } else {
                localStorageItems = JSON.parse(data);

                for (var item in localStorageItems) {
                    localStorage.setItem(`${item}`, localStorageItems[item]);
                }
            }
        });

        newConnection.on('close', function () {            
            connection = null;
            setStatusToWaiting();
            idField.value = peer.id;
        });
    }

    function addElementEventListeners() {
        newIdButton.addEventListener('click', function () {
            getNewPeer();
        });

        submitNewPeerIdButton.addEventListener('click', function () {
            newPeerIdModal.hide();

            const peerId = newPeerIdInput.value;

            connectToExistingPeer(peerId);
        });

        acceptIncomingConnectionButton.addEventListener('click', function () {
            acceptIncomingConnectionModal.hide();

            if (connection) {
                connection.close();
            }

            connection = currentlyHandledConnection;

            currentConnectionAccepted = true; // TODO true?

            setConnectionListeners(connection);

            connection.send('ACCEPT');

            setStatusToConnected();
        });

        declineIncomingConnectionButton.addEventListener('click', function () {
            acceptIncomingConnectionModal.hide();

            currentlyHandledConnection.send('DECLINE');
        });

        acceptIncomingConnectionModalElement.addEventListener('hidden.bs.modal', function () {
            handleNextUnhandledConnection();
        });

        newPeerIdModalElement.addEventListener('hidden.bs.modal', function () {
            handleNextUnhandledConnection();
        });

        closeConnectionButton.addEventListener('click', function () {
            if (connection) {
                connection.close();
                setStatusToWaiting();
                idField.value = peer.id;
            }
        });

        writeToLocalStorageButton.addEventListener('click', function () {
            localStorage.setItem('Web 2.0', `Projekt ${Date.now()}`);
            localStorage.setItem('Lorem ipsum', `${Math.random()}`);
        });

        syncToLocalStorageButton.addEventListener('click', function () {
            if (connection && connection.open) {
                localStorageString = JSON.stringify(window.localStorage);

                connection.send(localStorageString);
            }
        });
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
        handleNextUnhandledConnection();

        setStatusButtonSuccess();
        statusButton.innerHTML = 'Connected';
    }

    function setStatusToDeclined() {
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

    initialize();
})();