(function () {

    var lastPeerId = null;
    var peer = null; // own peer object
    var connection = null;
    var recvIdInput = document.getElementById("receiver-id");
    var status = document.getElementById("status");
    var message = document.getElementById("message");
    var cueString = "<span class=\"cueMsg\">Cue: </span>";
    
    var idField = document.getElementById('peerjs-id-field');
    var newPeerIdInput = document.getElementById('new-peer-id-input');

    var newIdButton = document.getElementById('new-id-button');
    var submitNewPeerIdButton = document.getElementById('submit-new-peer-id-button');
    var statusButton = document.getElementById('status-button');
    var acceptIncomingConnectionButton = document.getElementById('accept-incoming-connection-button');
    var declineIncomingConnectionButton = document.getElementById('decline-incoming-connection-button');

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

            // TODO send accept to other peer

            connection = currentlyHandledConnection;

            currentConnectionAccepted = false;

            setConnectionListeners(connection);

            connection.send('ACCEPT');

            setStatusButtonToConnected();
        });

        declineIncomingConnectionButton.addEventListener('click', function () {
            acceptIncomingConnectionModal.hide();

            // TODO send decline to other peer

            currentlyHandledConnection.send('DECLINE');
        });

        acceptIncomingConnectionModalElement.addEventListener('hidden.bs.modal', function () {
            handleFirstUnhandledConnection();
        });

        newPeerIdModalElement.addEventListener('hidden.bs.modal', function () {
            handleFirstUnhandledConnection();
        });
    };

    function getNewPeer() {
        if (connection !== null) {
            connection.close();
        }

        peer = new Peer({
            //host: TODO
            //port: TODO
            //path: TODO
            config: {'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' }
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

        //     c.on('open', function() {
        //         c.send("Sender does not accept incoming connections");
        //         setTimeout(function() { c.close(); }, 500);
        //     });

        //     // Allow only a single connection
        //     if (conn && conn.open) {
        //         c.on('open', function() {
        //             c.send("Already connected to another client");
        //             setTimeout(function() { c.close(); }, 500);
        //         });
        //         return;
        //     }
            
        //     conn = c;
        //     console.log("Connected to: " + conn.peer);
        //     status.innerHTML = "Connected";
        //     ready();

        //     conn.on('data', function (data) {
        //         console.log("Data recieved");
        //         var cueString = "<span class=\"cueMsg\">Cue: </span>";
        //         switch (data) {
        //             case 'Go':
        //                 go();
        //                 addMessage(cueString + data);
        //                 break;
        //             case 'Fade':
        //                 fade();
        //                 addMessage(cueString + data);
        //                 break;
        //             case 'Off':
        //                 off();
        //                 addMessage(cueString + data);
        //                 break;
        //             case 'Reset':
        //                 reset();
        //                 addMessage(cueString + data);
        //                 break;
        //             default:
        //                 addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
        //                 break;
        //         };
        //     });
        //     conn.on('close', function () {
        //         status.innerHTML = "Connection reset<br>Awaiting connection...";
        //         conn = null;
        //     });
        // });
        // peer.on('disconnected', function () {
        //     status.innerHTML = "Connection lost. Please reconnect";
        //     console.log('Connection lost. Please reconnect');

        //     // Workaround for peer.reconnect deleting previous id
        //     peer.id = lastPeerId;
        //     peer._lastServerId = lastPeerId;
        //     peer.reconnect();
        // });

        peer.on('close', function() {
            connection = null;
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

            // var cueString = "<span class=\"cueMsg\">Cue: </span>";
            // switch (data) {
            //     case 'Go':
            //         go();
            //         addMessage(cueString + data);
            //         break;
            //     case 'Fade':
            //         fade();
            //         addMessage(cueString + data);
            //         break;
            //     case 'Off':
            //         off();
            //         addMessage(cueString + data);
            //         break;
            //     case 'Reset':
            //         reset();
            //         addMessage(cueString + data);
            //         break;
            //     default:
            //         addMessage("<span class=\"peerMsg\">Peer: </span>" + data);
            //         break;
            // };
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

    /**
     * Create the connection between the two Peers.
     *
     * Sets up callbacks that handle any events related to the
     * connection and data received on it.
     */
    function join() {
        // Close old connection
        if (connection) {
            connection.close();
        }

        // Create connection to destination peer specified in the input field
        connection = peer.connect(recvIdInput.value, {
            reliable: true
        });

        connection.on('open', function () {
            status.innerHTML = "Connected to: " + connection.peer;
            console.log("Connected to: " + connection.peer);

            // Check URL params for comamnds that should be sent immediately
            var command = getUrlParam("command");
            if (command)
                connection.send(command);
        });
        // Handle incoming data (messages only since this is the signal sender)
        connection.on('data', function (data) {
            addMessage("<span class=\"peerMsg\">Peer:</span> " + data);
        });
        connection.on('close', function () {
            status.innerHTML = "Connection closed";
        });
    };

    /**
     * Get first "GET style" parameter from href.
     * This enables delivering an initial command upon page load.
     *
     * Would have been easier to use location.hash.
     */
    function getUrlParam(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.href);
        if (results == null)
            return null;
        else
            return results[1];
    };

    /**
     * Send a signal via the peer connection and add it to the log.
     * This will only occur if the connection is still alive.
     */
     function signal(sigName) {
        if (connection && connection.open) {
            connection.send(sigName);
            console.log(sigName + " signal sent");
            addMessage(cueString + sigName);
        } else {
            console.log('Connection is closed');
        }
    }

    // goButton.addEventListener('click', function () {
    //     signal("Go");
    // });
    // resetButton.addEventListener('click', function () {
    //     signal("Reset");
    // });
    // fadeButton.addEventListener('click', function () {
    //     signal("Fade");
    // });
    // offButton.addEventListener('click', function () {
    //     signal("Off");
    // });

    function addMessage(msg) {
        var now = new Date();
        var h = now.getHours();
        var m = addZero(now.getMinutes());
        var s = addZero(now.getSeconds());

        if (h > 12)
            h -= 12;
        else if (h === 0)
            h = 12;

        function addZero(t) {
            if (t < 10)
                t = "0" + t;
            return t;
        };

        message.innerHTML = "<br><span class=\"msg-time\">" + h + ":" + m + ":" + s + "</span>  -  " + msg + message.innerHTML;
    };

    function clearMessages() {
        message.innerHTML = "";
        addMessage("Msgs cleared");
    };

    // Listen for enter in message box
    // sendMessageBox.addEventListener('keypress', function (e) {
    //     var event = e || window.event;
    //     var char = event.which || event.keyCode;
    //     if (char == '13')
    //         sendButton.click();
    // });
    // Send message
    // sendButton.addEventListener('click', function () {
    //     if (conn && conn.open) {
    //         var msg = sendMessageBox.value;
    //         sendMessageBox.value = "";
    //         conn.send(msg);
    //         console.log("Sent: " + msg);
    //         addMessage("<span class=\"selfMsg\">Self: </span> " + msg);
    //     } else {
    //         console.log('Connection is closed');
    //     }
    // });

    // Clear messages box
    // clearMsgsButton.addEventListener('click', clearMessages);
    // // Start peer connection on click
    // connectButton.addEventListener('click', join);

    // Since all our callbacks are setup, start the process of obtaining an ID
    initialize();
})();