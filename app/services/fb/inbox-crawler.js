"use strict";

let _ = require("lodash");

let response = require("../response");
const event = require("../../socket/event");
const apiSender = require("../api-sender");
const utils = require("../../utils");

let getInboxesOfPage = (socket, mongoose, page_fb_id, access_token, query, service, next) => {
    let url = `https://graph.facebook.com/v2.10/${page_fb_id}/conversations?${query}&access_token=${access_token}`;
    if (next) {
        url = next;
    }

    let _inboxData = null;
    return service.apiSender.getFb(url)
        .then(
            inboxData => {
                _inboxData = inboxData;
                let inboxes = _inboxData.data;

                // if (socket) {
                // 	try {
                // 		notifyClient(socket, event, response, inboxes, page_fb_id);
                // 	} catch (err) {
                // 		console.log("getInboxesOfPage notifyClient", err);
                // 	}
                // }

                return saveInboxesIntoDb(mongoose, inboxes, page_fb_id, access_token, service);
            }
        )
        .then(
            inboxesModel => {
                return getMsgsOfInboxes(mongoose, inboxesModel, access_token, service);
            }
        )
        .catch(err => {
            console.log(err.message);
            console.log("getFb url", url);
        })
        .then(
            () => {
                if (_inboxData && _inboxData.paging && _inboxData.paging.next) {
                    let _next = _inboxData.paging.next;
                    return getInboxesOfPage(socket, mongoose, page_fb_id, access_token, query, service, _next);
                } else {
                    return Promise.resolve();
                }
            }
        );
};

let saveInboxesIntoDb = (mongoose, inboxes, page_fb_id, access_token, service) => {
    let Inbox = mongoose.model("Inbox");
    let Customer = mongoose.model("Customer");

    let promises = [];
    let _customerModel;
    for (let inbox of inboxes) {
        /** @namespace inbox.participants */
        let customer = inbox.participants.data.find((participant) => participant.id !== page_fb_id);
        customer.fb_id = customer.id;
        let alias = utils.createAliasNameCustomer(customer.name);
        customer.alias = alias;

        let inboxModel = new Inbox({
            thread_id: inbox.id,
            page_fb_id: page_fb_id,
            link: inbox.link,
            customer_alias: customer.alias,
            can_reply: inbox.can_reply,
            updated_time: inbox.updated_time,
            is_seen: false
        });

        let promise = Customer.updateCustomer(page_fb_id, customer.fb_id, customer.name, alias, {email: customer.email})
            .then(customerModel => {
                _customerModel = customerModel;
                inboxModel.customer = customerModel;
                return inboxModel.save();
            });
        // let promise = utils.getAvatarIdOf(customer.fb_id, access_token, apiSender)
        // 	.then(avatarUserId => {
        // 		inboxModel.customer_avatar_id = avatarUserId;
        // 		return inboxModel.save();
        // 	});

        promises.push(promise);
    }

    return Promise.all(promises);
};

let getMsgsOfInboxes = (mongoose, inboxesModel, access_token, service) => {
    if (!inboxesModel) {
        return Promise.resolve();
    }
    let promises = [];

    for (let inboxModel of inboxesModel) {
        let query = "fields=messages.limit(100){message,from,created_time,attachments, shares{description,link,name,id}}";
        promises.push(getMsgsOfInbox(mongoose, inboxModel, access_token, query, service));
    }

    return Promise.all(promises);
};

let getMsgsOfInbox = (mongoose, inboxModel, access_token, query, service, next) => {
    let url = `https://graph.facebook.com/v2.10/${inboxModel.thread_id}?${query}&access_token=${access_token}`;
    if (next) {
        url = next;
    }

    let msgsData = null;
    return service.apiSender.getFb(url)
        .then(
            fbData => {
                if (fbData.messages) {
                    msgsData = fbData.messages;
                } else {
                    msgsData = fbData;
                }

                return saveMsgsToDb(mongoose, msgsData.data, inboxModel, inboxModel.page_fb_id, service);
            }
        )
        .catch(err => {
            console.log(err.message);
            console.log("getFb url", url);
        })
        .then(
            () => {
                if (msgsData && msgsData.paging && msgsData.paging.next) {
                    let _next = msgsData.paging.next;
                    return getMsgsOfInbox(mongoose, inboxModel, access_token, query, service, _next);
                } else {
                    return Promise.resolve();
                }
            }
        );
};

let saveMsgsToDb = (mongoose, msgs, inboxModel, page_fb_id, service) => {
    let Message = mongoose.model("Message");

    let promises = [];

    for (let msg of msgs) {
        let newAttachments = null;
        let newShares = null;
        if (msg.attachments && msg.attachments.data) {
            newAttachments = service.parser.parseAttachments(msg.attachments.data);
        }
        if (msg.shares && msg.shares.data) {
            newShares = service.parser.parserShares(msg.shares.data);
        }
        let from = msg.from;
        from.fb_id = from.id;
        delete from.id;
        console.log("from la ", from);
        let msgModel = new Message({
            fb_id: msg.id,
            // thread_id: inboxModel.thread_id,
            inbox: inboxModel,
            page_fb_id: page_fb_id,
            message: msg.message,
            from: from,
            attachments: newAttachments,
            shares: newShares,
            updated_time: msg.created_time
        });

        promises.push(msgModel.save());
    }

    return Promise.all(promises);
};

let getMesssage = (mongoose, inboxModel, access_token, query, service, arrayMsg, next) => {
    let url = `https://graph.facebook.com/v2.10/${inboxModel.thread_id}?${query}&access_token=${access_token}`;
    if (next) {
        url = next;
    }

    let msgsData = null;
    let msgsRes = null;
    let lengthFixed = null;
    let lengthCurrent = null;

    return service.apiSender.getFb(url)
        .then(
            fbData => {
                if (fbData.messages) {
                    msgsData = fbData.messages;
                } else {
                    msgsData = fbData;
                }
                lengthFixed = msgsData.data.length;
                return saveMsgToDatabase(mongoose, msgsData.data, inboxModel.thread_id, inboxModel.page_fb_id, service, []);
            }
        )
        .then((msgs) => {
            msgsRes = msgs;
            lengthCurrent = msgsRes.length;
            return mergeArray(msgsRes, arrayMsg);

        })
        .then(arrayMerged => {
            arrayMsg = arrayMerged;
            if (lengthCurrent < lengthFixed) {
                return Promise.resolve(arrayMsg.reverse());
            } else {
                if (msgsData.paging && msgsData.paging.next) {
                    let _next = msgsData.paging.next;
                    return getMesssage(mongoose, inboxModel, access_token, query, service, arrayMsg, _next);
                } else {
                    return Promise.resolve();
                }
            }
        })
        .catch(err => {
            console.log("getMesssage ", err.message);
        });
};

let saveMsgToDatabase = (mongoose, msgs, inbox_id, page_fb_id, service, msgsRes) => {
    let Message = mongoose.model("Message");
    let messageCurrent = null;

    if (msgs[0]) {
        let newAttachments = null;
        let newShares = null;
        if (msgs[0].attachments && msgs[0].attachments.data) {
            newAttachments = service.parser.parseAttachments(msgs[0].attachments.data);
        }
        if (msgs[0].shares && msgs[0].shares.data) {
            newShares = service.parser.parserShares(msgs[0].shares.data);
        }
        let from = {...msgs[0].from};
        from.fb_id = from.id;
        delete from.id;
        let msgModel = new Message({
            fb_id: msgs[0].id,
            inbox: inbox_id,
            page_fb_id: page_fb_id,
            message: msgs[0].message,
            from: from,
            attachments: newAttachments,
            shares: newShares,
            updated_time: msgs[0].created_time
        });
        return msgModel.save()
            .then((msg) => {
                msgs.shift();
                messageCurrent = msg.toJSON();
                let snippet = messageCurrent.message;
                let updatedTime = messageCurrent.updated_time;
                return updateSnippetAndTime(mongoose, inbox_id, snippet, updatedTime);
            })
            .then((inbox) => {
                messageCurrent.parent = inbox.toJSON();
                messageCurrent.parent.type = "inbox";
                msgsRes.push(messageCurrent);
                return saveMsgToDatabase(mongoose, msgs, inbox_id, page_fb_id, service, msgsRes);
            })
            .catch(err => {
                if (err.message) {
                    if (/DUPLICATE KEY/.test(err.message.toUpperCase())) {
                        return Promise.resolve(msgsRes);
                    }
                }
                else {
                    return Promise.reject(err);
                }
            });
    }
    else {
        return Promise.resolve(msgsRes);
    }
};

let updateSnippetAndTime = (mongoose, inbox_id, snippet, updatedTime) => {
    let Inbox = mongoose.model("Inbox");

    return Inbox.findOne(inbox_id)
        .then((inbox) => {
            if (_.isEmpty(inbox)) {
                throw new Error("Inbox not found");
            }
            inbox.snippet = snippet;
            inbox.updated_time = updatedTime;
            inbox.is_seen = false;
            return inbox.save();
        })
        .catch(err => {
            return console.log("updateSnippetAndTime Error ", err);
        });
};

let mergeArray = (sour, dest) => {
    for (let item of sour) {
        dest.push(item);
    }
    return new Promise((resolve, reject) => {
        return resolve(dest);
    });
};

let notifyClient = (_socket, _event, _response, inboxes, page_fb_id) => {
    if (!Array.isArray(inboxes) || inboxes.length === 0) return;

    let _participants = inboxes
        .map(inbox => {
            let _filterInbox = inbox.participants
                .data
                .filter(participant => participant.id !== page_fb_id);

            return _filterInbox.pop();
        })
        .map(participant => {
            return participant.name;
        });

    let data = {
        type: "inbox",
        items: _participants
    };

    let update = _response().success(data);
    // _socket.emit(_event.ACTIVE_PAGE_UPDATE_EVENT, update);
};

exports.getConversation = (thread_id, access_token, service) => {
    let query = 'fields=participants,link,id,can_reply,messages.limit(10){message,attachments,shares{description,link,name,id},from,created_time}';
    let url = `https://graph.facebook.com/v2.11/${thread_id}?${query}&access_token=${access_token}`;

    return service.apiSender.get(url)
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message);
            }

            return Promise.resolve(data);
        })
};
exports.getAttachmentsOfMsg = (msg_fb_id, access_token, query, service) => {
    let url = `https://graph.facebook.com/v2.11/${msg_fb_id}?${query}&access_token=${access_token}`;
    return service.apiSender.get(url);
};

exports.getInboxesOfPage = getInboxesOfPage;
exports.getMsgsOfInbox = getMsgsOfInbox;
exports.saveMsgsToDb = saveMsgsToDb;
exports.updateSnippetAndTime = updateSnippetAndTime;
exports.getMesssage = getMesssage;
