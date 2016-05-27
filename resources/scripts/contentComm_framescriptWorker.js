var msgchan = new MessageChannel();
self.postMessage({
	port1: msgchan.port1,
	port2: msgchan.port2
}, [msgchan.port1, msgchan.port2]);