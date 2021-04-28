(function () {

    var peerJsHost = "";
    var peerJsPort = "";
    var peerJsPath = "";
    var iceServer = "";

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

    var newPeerIdModal = new bootstrap.Modal(document.getElementById('enterNewPeerIdModal'));
    var acceptIncomingConnectionModal = new bootstrap.Modal(document.getElementById('acceptIncomingConnectionModal'));
    
    var newPeerIdModalElement = document.getElementById('enterNewPeerIdModal');
    var acceptIncomingConnectionModalElement = document.getElementById('acceptIncomingConnectionModal');

    var acceptIncomingConnectionText = document.getElementById('accept-incoming-connection-text');
    
    var unhandledIncomingConnections = [];
    var currentlyHandledConnection = undefined;

    var currentConnectionAccepted = false;


    /**
     * Create the Peer object for our end of the connection.
     *
     * Sets up callbacks that handle any events related to our
     * peer object.
     */
    function initialize() {

        getNewPeer();

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

            currentConnectionAccepted = false;

            setConnectionListeners(connection);

            connection.send('ACCEPT');

            setStatusButtonToConnected();
        });

        declineIncomingConnectionButton.addEventListener('click', function () {
            acceptIncomingConnectionModal.hide();

            currentlyHandledConnection.send('DECLINE');
        });

        acceptIncomingConnectionModalElement.addEventListener('hidden.bs.modal', function () {
            handleFirstUnhandledConnection();
        });

        newPeerIdModalElement.addEventListener('hidden.bs.modal', function () {
            handleFirstUnhandledConnection();
        });

        closeConnectionButton.addEventListener('click', function () {
            if (connection) {
                connection.close();
                setStatusButtonToWaiting();
                idField.value = peer.id;
            }
        });
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
        setStatusButtonToWaiting();
    }

    function connectToExistingPeer(peerId) {
        setStatusButtonToConnecting();

        if (connection) {
            connection.close();
        }

        connection = peer.connect(peerId, {
            reliable: true
        });

        currentConnectionAccepted = false;

        setConnectionListeners(connection);
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

            if (newPeerIdModal._isShown || acceptIncomingConnectionModal._isShown) {
                unhandledIncomingConnections.push(newConnection);

            } else {
                showAcceptConnectionModal(newConnection);
            }
        });

        peer.on('close', function() {
            alert('Peer close unhandled')
            connection = null;
            setStatusButtonToWaiting();
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
                    setStatusButtonToConnected();
                    idField.value = `${connection.peer}`;
                }

                if (data === 'DECLINE') {
                    connection.close();
                    setStatusButtonToDeclined();
                }
            }
        });

        newConnection.on('close', function () {            
            connection = null;
            setStatusButtonToWaiting();
            idField.value = peer.id;
        });
    }

    function handleFirstUnhandledConnection() {
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

    function setStatusButtonToWaiting() {
        setStatusButtonWarning();
        statusButton.innerHTML = 'Waiting';
    }

    function setStatusButtonToConnecting() {
        setStatusButtonWarning();
        statusButton.innerHTML = 'Connecting';
    }

    function setStatusButtonToConnected() {
        setStatusButtonSuccess();
        statusButton.innerHTML = 'Connected';
    }

    function setStatusButtonToDeclined() {
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