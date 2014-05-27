// ==UserScript==
// @name       TF2Center Notifications
// @namespace  http://nikkii.us
// @version    1.3
// @author	   Nikki
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
		$.getScript(NOTIFY_SCRIPT, function() {
			startScript();
		});
	}
})();

function startScript() {
	var $nameElem = $('.playerTopName');
	if ($nameElem.length < 1) {
		return;
	}
	// Load player name into a variable
	unsafeWindow.playerName = $nameElem.text();
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
	$('.filterButtons').append('<div style="height: 5px;"></div><div class="filterSwitch off" id="notifications"><button id="notificationBtn" class="btn size32x32 grey"><div class="icons grips vertical"></div></button><div class="filterSign">Notif. OFF</div></div><button class="btn size108x32 grey" id="nicknames">Nicknames</button>');
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
	$(document).on('click', '#nicknames', function(e) {
		promptNicknames();
	});
}

function notificationPermissionsChanged() {
	var perm = notify.permissionLevel();
	if (perm == notify.PERMISSION_GRANTED && notificationsEnabled) {
		$('#notifications').removeClass('off').addClass('on');
		$('#notifications .filterSign').text('Notif. ON');
	} else if (perm == notify.PERMISSION_DEFAULT || perm == notify.PERMISSION_DENIED || !notificationsEnabled) {
		$('#notifications').removeClass('on').addClass('off');
		$('#notifications .filterSign').text('Notif. OFF');
	}
}

function loadNicknames() {
	nicknames = JSON.parse(GM_getValue('nicknames', '[]'));
	
	if (!nicknames || !nicknames.length) {
		promptNicknames();
	}
}

function promptNicknames() {
	var input = prompt('Please enter any nicknames you may have, separated by a comma.', nicknames.length > 0 ? nicknames.join(', ') : unsafeWindow.playerName);
	
	if (!input) {
		return;
	}
	
	nicknames = input.split(',');
	for (var i = 0; i < nicknames.length; i++) {
		nicknames[i] = nicknames[i].trim();
	}
	
	GM_setValue('nicknames', JSON.stringify(nicknames));
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
			createNotification('Ready up!', 'Lobby ' + $('.lobbyHeaderID').text() + ' is ready, ready up!');
		}
	};
}

function hookChatMessage() {
	var oldChatMsg = addChatMsg;
	unsafeWindow.addChatMsg = function(json) {
		if (oldChatMsg) {
			oldChatMsg(json);
		}
		
		if (!notificationsEnabled) {
			return;
		}
		
		var obj = JSON.parse(json);
		if (obj.authorSteamId == 'TF2Center' && obj.authorName == 'TF2Center') {
			// Internal message
			var lobbyId = $('.lobbyHeaderID').text();
			if (obj.message == 'Lobby almost ready') {
				createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' is almost ready!');
			} else if (obj.message == 'Lobby open') {
				createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' is open again.');
			} else if (obj.message.indexOf('Leadership transfered to') == 0) {
				var user = obj.message.substring(obj.message.indexOf('to') + 3);
				createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' leadership has been transfered to ' + (user == unsafeWindow.playerName ? 'you!' : user  + '.'));
			} else if (obj.message.indexOf('Lobby closed') == 0) {
				var reason = obj.message.substring(obj.message.indexOf(':')+2);
				
				// Reasons are:
				// MANUAL_LEADER - lobby was closed by the leader
				// MANUAL_ADMIN - lobby was closed by an admin
				// EXCESSIVE_SUBS - lobby has had too many sub requests/is missing too many players
				// MATCH_ENDED - match is complete (tf_game_over)
				// SERVER_UNREACHABLE - ???
				switch(reason) {
				case 'MANUAL_LEADER':
					createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' has been closed by the leader.');
					break;
				case 'MANUAL_ADMIN':
					createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' has been closed by an admin.');
					break;
				case 'EXCESSIVE_SUBS':
					createNotification('TF2Center Lobby', 'Lobby ' + lobbyId + ' has been closed due to an excessive number of players leaving.');
					break;
				}
			}
		} else if (checkForName(obj.message) && !isMySteamId(obj.authorSteamId)) {
			// Highlighted message
			createNotification('TF2Center Message', obj.authorName + ': ' + unescapeHtml(obj.message));
		}
	};
}

function checkForName(message) {
	message = message.toLowerCase();
	if (message.indexOf(unsafeWindow.playerName) != -1) {
		return true;
	}
	for (var i = 0; i < nicknames.length; i++) {
		if (message.indexOf(nicknames[i].toLowerCase()) != -1) {
			return true;
		}
	}
	return false;
}

function unescapeHtml(html) {
	var $elem = $('<textarea />').html(html);
	var decoded = $elem.text();
	$elem.remove();
	return decoded;
}

function createNotification(title, body) {
	notify.createNotification(title, {
		icon : TF2C_ICON,
		body : body
	});
}