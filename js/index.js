var socket = io.connect();

window.addEventListener('load', function() {
	var messageForm = document.getElementById('messagesForm');
	messageForm.addEventListener('submit', sendMessage, false);

	function sendMessage(e) {
		e.preventDefault();
		post_string = [2013, 2014, [1,2], 0, 15, 1, 1];
		/* notify the server of the newly submitted message */
		socket.emit('filter', post_string);
//		document.getElementById('messageField').value = null;
	}
},false);