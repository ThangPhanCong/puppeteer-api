"use strict";

const apiSender = require("../api-sender");

exports.sendMsgToInbox = (message, thread_id, access_token) => {
	let url = `https://graph.facebook.com/v2.10/${thread_id}/messages?access_token=${access_token}`;
	let payload = {message};

	return apiSender.postFb(url, payload);
};

exports.sendMsgToMessenger = (message, p_id, access_token) => {
	let messageData = {
    recipient: {
      id: p_id
    },
    message: {
      text: message
    }
  };
	return apiSender.callSendMessengerAPI(messageData, access_token);
};

// function sendTextMessageToMessenger(messageText, recipientId, pageToken, cb) {
//   let messageData = {
//     recipient: {
//       id: recipientId
//     },
//     message: {
//       text: messageText
//     }
//   };
//
//   callSendAPI(messageData, pageToken, cb);
// }

// target_id: post_id | comment_id
exports.repComment = (message, attachment_url, target_id, access_token) => {
	let url = `https://graph.facebook.com/v2.10/${target_id}/comments?access_token=${access_token}`;
	let payload = {message};

	if (attachment_url) {
		payload.attachment_url = attachment_url;
	}
	return apiSender.postFb(url, payload);
};

exports.repliesPrivately = (message, cmt_id, access_token) => {
	let url = `https://graph.facebook.com/v2.10/${cmt_id}/private_replies?access_token=${access_token}`;
	let payload = {message};

	return apiSender.postFb(url, payload);
};
