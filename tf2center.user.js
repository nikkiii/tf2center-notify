// ==UserScript==
// @name       TF2Center Notifications
// @namespace  http://nikkii.us
// @version    1.2
// @description  Adds ready and message notifications to TF2Center
// @match      http://rc.tf2center.com/*
// @copyright  2014+, Nikki
// ==/UserScript==

BASE_PATH = 'http://cdn.probablyaserver.com/nikki/tf2c';
NOTIFY_SCRIPT = BASE_PATH + '/desktop-notify-min.js';
TF2C_ICON = BASE_PATH + '/tf2logo.png';
TIMEOUT_MILLIS = 30000;

nicknames = [ ];

notificationsEnabled = true;

// Add notify
(function(){
	// Immediately stop log spam
	hookLogChange();
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
	// Load player name into a variable
	unsafeWindow.playerName = $('.playerTopName').text();
	notificationsEnabled = GM_getValue('enabled', true);
	// Set notify settings
	notify.config({
		autoClose : TIMEOUT_MILLIS
	});
	// Hook and load stuff
	loadNicknames();
	hookReadyUp();
	hookChatMessage();
	// Button to change notification permissions
	addNotificationButton();
}

function addNotificationButton() {
	$('.filterButtons').append('<div class="filterSwitch off" id="notifications"><button id="notificationBtn" class="btn size32x32 grey"><div class="icons grips vertical"></div></button><div class="filterSign">Notif. OFF</div></div>');
	notificationPermissionsChanged();
	$(document).on('click', '#notificationBtn', function(e) {
		var perm = notify.permissionLevel();
		if (perm != notify.PERMISSION_GRANTED) {
			notify.requestPermission(notificationPermissionsChanged);
		} else {
			notificationsEnabled = !$('#notifications').hasClass('on');
			console.log('Changed to ' + notificationsEnabled);
			GM_setValue('enabled', notificationsEnabled);
			notificationPermissionsChanged();
		}
	});
}

function notificationPermissionsChanged() {
	var perm = notify.permissionLevel();
	if (perm == notify.PERMISSION_GRANTED && notificationsEnabled) {
		$('#notifications').removeClass('off').addClass('on');
		$('#notifications .filterSign').text('Notif. ON');
	} else if (!notificationsEnabled) {
		$('#notifications').removeClass('on').addClass('off');
		$('#notifications .filterSign').text('Notif. OFF');
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
		if (notificationsEnabled) {
			notify.createNotification('Ready up!', {
				icon : TF2C_ICON,
				body : 'Lobby is ready, ready up!'
			});
		}
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
			if (notificationsEnabled) {
				notify.createNotification('TF2Center Message', {
					icon : TF2C_ICON,
					body : obj.authorName + ': ' + obj.message
				});
			}
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