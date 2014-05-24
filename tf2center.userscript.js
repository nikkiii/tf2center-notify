// ==UserScript==
// @name       TF2Center Notifications
// @namespace  http://nikkii.us
// @version    0.1
// @description  Adds ready and message notifications to TF2Center
// @match      http://rc.tf2center.com/*
// @copyright  2014+, Nikki
// ==/UserScript==

BASE_PATH = 'http://cdn.probablyaserver.com/nikki/tf2c';
NOTIFY_SCRIPT = BASE_PATH + '/desktop-notify-min.js';
TF2C_ICON = BASE_PATH + '/tf2logo.png';

nicknames = [ ];

// Add notify
(function(){
	if (typeof unsafeWindow.notify == 'undefined') {
		var headTag = document.getElementsByTagName('head')[0] || document.documentElement,
			notifyTag = document.createElement('script');

		notifyTag.src = NOTIFY_SCRIPT;
		notifyTag.type = 'text/javascript';
		notifyTag.async = true;

		headTag.insertBefore(notifyTag, headTag.firstChild);
	}
	load_wait();
})();

// Check if notify's loaded
function load_wait() {
	if (typeof unsafeWindow.notify == 'undefined') {
		window.setTimeout(load_wait, 100);
	} else {
		startScript();
	}
}

function startScript() {
	// Check permission level
	var perm = notify.permissionLevel();
	if (perm == notify.PERMISSION_DEFAULT) {
		notify.requestPermission(startScript);
	} else if (perm == notify.PERMISSION_DENIED) {
		alert('You have denied permissions required for notifications. Please accept it to use this script.');
	} else {
		// Load player name into a variable
		unsafeWindow.playerName = $('.playerTopName').text();
		// Hook and load stuff
		loadNicknames();
		hookLogChange();
		hookReadyUp();
		hookChatMessage();
	}
}

function loadNicknames() {
	var names = JSON.parse(GM_getValue('nicknames', '[]'));
	
	if (!names || !names.length) {
		var input = prompt('Please enter any nicknames you may have, separated by a comma.', unsafeWindow.playerName);
		
		names = input.split(',');
		for (var i = 0; i < names.length; i++) {
			names[i] = names[i].trim();
		}
		
		GM_setValue('nicknames', JSON.stringify(names));
	}
	
	nicknames = names;
}

function hookLogChange() {
	var oldInfo = unsafeWindow.console['info'];
	unsafeWindow.console['info'] = function(text) {
		if (text.indexOf('response.responseBody') == -1) {
			oldInfo(text);
		}
	};
}

function hookReadyUp() {
	var old = unsafeWindow.playReadySoundHeavy;
	unsafeWindow.playReadySoundHeavy = function() {
		old();
		notify.createNotification('Ready up!', {
			icon : TF2C_ICON,
			body : 'Lobby is ready, ready up!'
		});
	};
}

function hookChatMessage() {
	var oldChatMsg = addChatMsg;
	unsafeWindow.addChatMsg = function(json) {
		if (oldChatMsg) {
			oldChatMsg(json);
		}
		
		var obj = JSON.parse(json);
		if (checkForName(obj.message)) {
			notify.createNotification('Message', {
				icon : TF2C_ICON,
				body : obj.authorName + ': ' + obj.message
			});
		}
	};
}

function checkForName(message) {
	message = message.toLowerCase();
	for (var i = 0; i < nicknames.length; i++) {
		if (message.indexOf(nicknames[i].toLowerCase()) != -1) {
			return true;
		}
	}
	return false;
}