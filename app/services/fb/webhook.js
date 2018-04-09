"use strict";

const _ = require("lodash");
const utils = require("../../utils");
const MATCH_RETRY_TIME = 2000;

exports.handleEvent = (entry, helper) => {
    if (entry.changes) {
        handleEventChanges(helper.mongoose, entry, helper.service, helper);
    }
};

let handleEventChanges = (mongoose, changesEvent, service, helper) => {
    for (let change of changesEvent.changes) {
        if (change) {
            let field = change.field;
            let value = change.value;
            let verb = change.value.verb;
            if (/feed/.test(field)) {
                let page_fb_id = changesEvent.id;
                updateFeedFromWebhook(mongoose, value, page_fb_id, service, helper);
            } else if (/conversations/.test(field)) {
                let page_fb_id = value.page_id;
                updateInbox(mongoose, value, page_fb_id, service, helper);
            }
        }
    }
};

let updateFeedFromWebhook = (mongoose, value, page_fb_id, service, helper) => {
    /** @namespace value.parent_id */
    if ((value.item === "status" || value.item === 'video' || value.item === 'photo') && /add/.test(value.verb)) {
        updatePost(mongoose, value, page_fb_id, service);
    } else if (value.item === "comment" && value.post_id === value.parent_id) {
        updateCmt(mongoose, value, page_fb_id, service, helper);
    } else if (value.item === "comment") {
        updateReplyCmt(mongoose, value, page_fb_id, service, helper);
    }
};

let updatePost = (mongoose, value, page_fb_id, service) => {
    let Page = mongoose.model("Page");
    let Post = mongoose.model("Post");
    let attachments = [];
    let _page = null;
    let query = "fields=attachments,message,id,created_time,updated_time,story";
    let postCurrent;
    let newAttachments = null;

    Page.findByFbId(page_fb_id)
        .then((page) => {
            if (_.isEmpty(page)) {
                throw new Error("Page not found");
            }
            _page = page;
            let access_token = page.fb_access_token;
            return service.post.getPost(value.post_id, access_token, query);
        })
        .then(post => {
            postCurrent = post;
            if (postCurrent.attachments && postCurrent.attachments.data) {
                newAttachments = service.parser.parseAttachments(postCurrent.attachments.data);
            }
            return Post.findByFbId(value.post_id);
        })
        .then(postDb => {
            if (postDb) {
                postDb.fb_id = postCurrent.id;
                postDb.page_fb_id = page_fb_id;
                postDb.page_fb_name = _page.name;
                postDb.message = postCurrent.message;
                postDb.attachments = newAttachments;
                postDb.updated_time = postCurrent.updated_time;
                postDb.created_time = postCurrent.created_time;
                postDb.story = postCurrent.story || null;
                return postDb.save();
            } else {
                let postModel = new Post({
                    fb_id: postCurrent.id,
                    page_fb_id: page_fb_id,
                    page_fb_name: _page.name,
                    message: postCurrent.message,
                    attachments: newAttachments,
                    updated_time: postCurrent.updated_time,
                    created_time: postCurrent.created_time,
                    story: postCurrent.story || null
                });
                postModel.save();
            }
        });
};

let updateCmt = (mongoose, value, page_fb_id, service, helper) => {
    /** @namespace value.comment_id */
    let comment_fb_id = value.comment_id;
    let post_fb_id = value.post_id;
    let Page = mongoose.model("Page");
    let access_token = null;
    let cmt = null;
    let Customer = mongoose.model("Customer");
    let Comment = mongoose.model("Comment");
    let commentCurrent = null;
    let phoneNumber = [];
    let customerCurrent = null;
    let _page;
    if (/remove/.test(value.verb)) {
        Comment.findByFbId(comment_fb_id)
            .then(comment => {
                if (comment) {
                    comment.is_like = false;
                    comment.is_private = false;
                    comment.is_hidden = false;
                    comment.can_reply_privately = false;
                    comment.can_remove = false;
                    comment.can_like = false;
                    comment.can_hide = false;
                    comment.can_comment = false;
                    comment.is_seen = false;
                    return comment.save();
                } else {
                    throw new Error("Comment not found");
                }
            })
            .catch(err => console.log("updateCmt", err));
    } else if (/add/.test(value.verb)) {
        Page.findByFbId(page_fb_id)
            .then((page) => {
                if (_.isEmpty(page)) {
                    throw new Error("Page not found");
                }
                _page = page;
                access_token = page.fb_access_token;
                return service.fbPostCrawl.getCmt(mongoose, page_fb_id, post_fb_id, comment_fb_id, access_token, service);
            })
            .then((cmts) => {
                if (Array.isArray(cmts) && cmts.length > 0) {
                    cmt = cmts[0];
                    cmt = cmt.toJSON();
                    cmt.parent = _.clone(cmt);
                    cmt.parent.type = "comment";
                    cmt.parent.snippet = cmt.message;
                    cmt.parent.page = _.clone(_page);
                    if (cmt.can_hide) {
                        return checkHideCmt(mongoose, post_fb_id, comment_fb_id, access_token, service);
                    }
                }
            })
            .then(() => {
                return utils.matchPhoneNumber(cmt.message);
            })
            .then((checkedPhoneNumber) => {
                if (checkedPhoneNumber && checkedPhoneNumber.hasPhoneNumber) {
                    phoneNumber = checkedPhoneNumber.phoneNumber;
                }
                let user_fb_id = cmt.from.fb_id;
                if (cmt.from.fb_id !== page_fb_id) {
                    return Customer.updateCustomer(page_fb_id, user_fb_id, cmt.from.name, cmt.from.alias, {phone: phoneNumber});
                }
            })
            .then((customer) => {
                if (customer) {
                    customerCurrent = customer;
                }
                return Comment.findByFbId(comment_fb_id);
            })
            .then((cmtModel) => {
                cmtModel.customer = customerCurrent;
                cmt.parent.customer = customerCurrent;
                return cmtModel.save();
            })
            .then(() => {
                utils.sendCmtToClient(cmt, helper);
            })
            .catch(err => console.log("updateCmt", err));
    }

};

let updateReplyCmt = (mongoose, value, page_fb_id, service, helper) => {
    let comment_fb_id = value.comment_id;
    let parent_fb_id = value.parent_id;
    let post_fb_id = value.post_id;
    let Page = mongoose.model("Page");
    let Comment = mongoose.model("Comment");
    let Customer = mongoose.model("Customer");
    let commentCurrent = null;
    let phoneNumber = [];
    let customerCurrent = null;
    if (/remove/.test(value.verb)) {
        Comment.findByFbId(comment_fb_id)
            .then(comment => {
                if (comment) {
                    comment.is_like = false;
                    comment.is_private = false;
                    comment.is_hidden = false;
                    comment.can_reply_privately = false;
                    comment.can_remove = false;
                    comment.can_like = false;
                    comment.can_hide = false;
                    comment.can_comment = false;
                    comment.is_seen = false;
                    return comment.save();
                } else {
                    throw new Error("RepComment not found");
                }
            })
            .catch(err => console.log("updateRepCmt", err));
    } else if (/add/.test(value.verb)) {
        Page.findByFbId(page_fb_id)
            .then((page) => {
                if (_.isEmpty(page)) {
                    throw new Error("Page not found");
                }
                let access_token = page.fb_access_token;
                return service.fbPostCrawl.getCmt(mongoose, page_fb_id, parent_fb_id, comment_fb_id, access_token, service);
            })
            .then((cmts) => {
                if (Array.isArray(cmts) && cmts.length > 0) {
                    commentCurrent = cmts[0];
                    return utils.matchPhoneNumber(commentCurrent.message);

                }
            })
            .then((checkedPhoneNumber) => {
                if (checkedPhoneNumber && checkedPhoneNumber.hasPhoneNumber) {
                    phoneNumber = checkedPhoneNumber.phoneNumber;
                }
                let user_fb_id = commentCurrent.from.fb_id;
                if (commentCurrent.from.fb_id !== page_fb_id) {
                    return Customer.updateCustomer(page_fb_id, user_fb_id, commentCurrent.from.name, commentCurrent.from.alias, {phone: phoneNumber});
                }
            })
            .then((customer) => {
                if (customer) {
                    customerCurrent = customer;
                }
                return Comment.findByFbId(parent_fb_id);
            })
            .then((cmtModel) => {
                if (cmtModel) {
                    cmtModel.snippet = commentCurrent.message;
                    cmtModel.is_seen = false;
                    cmtModel.updated_time = commentCurrent.updated_time;
                    return cmtModel.save();
                }
            })
            .then((cmt) => {
                commentCurrent = commentCurrent.toJSON();
                if (cmt) {
                    commentCurrent.parent = cmt.toJSON();
                    commentCurrent.parent.type = "comment";
                }
                return Comment.findByFbId(comment_fb_id);

            })
            .then(cmt => {
                if (cmt) {
                    cmt.customer = customerCurrent;
                }
                return cmt.save();
            })
            .then(() => {
                utils.sendCmtToClient(commentCurrent, helper);
            })
            .catch(err => console.log("updateReplyCmt", err.message));
    }

};

// const updateInbox = (mongoose, value, page_fb_id, service, helper) => {
// 	let Inbox = mongoose.model("Inbox");
// 	let WaitMessage = mongoose.model("WaitMessage");
// 	let Page = mongoose.model("Page");
// 	let Customer = mongoose.model("Customer");
// 	let thread_id = value.thread_id;
// 	let _page;
// 	let _inbox;
// 	let _conversation;
// 	let _customer;
// 	let _customerModel;
// 	let _messages;
// 	let _matchMessage;
// 	let _firstMessage;
//
// 	Inbox.findOne({thread_id: thread_id})
// 		.populate('customer')
// 		.then(inbox => {
// 			_inbox = inbox;
// 			if (inbox && inbox.p_id && inbox.p_id !== '') {
// 				// do nothing
// 			} else {
// 				// console.log('conversation change value ', value);
// 				Page.findOne({fb_id: page_fb_id})
// 					.then(page-server => {
// 						if (!page-server) throw new Error('Not found page-server');
//
// 						_page = page-server;
// 						return service.fbInboxCrawl.getConversation(thread_id, page-server.fb_access_token);
// 					})
// 					.then(conversation => {
// 						_conversation = conversation;
// 						if (_conversation.messages && _conversation.messages.data) {
// 							let messages = _conversation.messages.data;
// 							_customer = conversation.participants.data.find(participant => participant.id !== page_fb_id);
// 							_customer.alias = utils.createAliasNameCustomer(_customer.name);
// 							return Promise.resolve(messages);
// 						} else {
// 							throw new Error('Message data not found');
// 						}
// 					})
// 					// match app_id && page_id of fb user
// 					.then(messages => {
// 						_messages = messages;
// 						_firstMessage = _messages[0];
// 						// v5, use messages to match id
// 						return matchMessage(messages, _page, helper);
// 					})
// 					.then(matchMessage => {
// 						_matchMessage = matchMessage;
//
// 						// save customer info
// 						return Customer.updateCustomer(page_fb_id, _customer.id, _customer.name, _customer.alias,  {email:_customer.email});
// 					})
// 					.then(customerModel => {
// 						_customerModel = customerModel;
// 					})
// 					.then(() => {
// 						if (_matchMessage) {
// 							return Promise.resolve(_matchMessage.p_id)
// 								.then(p_id => {
// 									if (_inbox) {
// 										_inbox.p_id = p_id;
// 										_inbox.snippet = _firstMessage.message;
// 										_inbox.updated_time = Date.now();
// 										return _inbox.save();
// 									} else {
// 										let inbox = new Inbox({
// 											thread_id: _conversation.id,
// 											p_id: p_id,
// 											snippet: _firstMessage.message,
// 											link: _conversation.link,
// 											can_reply: _conversation.can_reply,
// 											customer_alias: _customer.alias,
// 											customer: _customerModel,
// 											updated_time: Date.now(),
// 											page_fb_id: page_fb_id
// 										})
//
// 										return inbox.save();
// 									}
// 								})
// 								.then(inbox => {
// 									// check wait message && send msg to socket client
// 									if (inbox.thread_id && inbox.p_id) {
// 										utils.checkWaitedMessageQueue(inbox, helper);
//
// 										console.log('id matched', inbox.thread_id, inbox.p_id);
// 									}
// 								})
// 						} else {
// 							// throw new Error('not found message in thread ' + thread_id);
// 							// insert msg to _inbox => send to client
// 							if (_inbox) {
// 								_inbox.snippet = _firstMessage.message;
// 								_inbox.save();
// 								saveConversationMessages(_messages, _inbox, _customer, helper);
// 							} else {
// 								// insert new _inbox => insert msg to _inbox => send to client
// 								let newConversationInbox = new Inbox({
// 									thread_id: _conversation.id,
// 									snippet: _firstMessage.message,
// 									link: _conversation.link,
// 									can_reply: _conversation.can_reply,
// 									customer_alias: _customer.alias,
// 									customer: _customerModel,
// 									page_fb_id: page_fb_id,
// 									updated_time: Date.now()
// 								})
//
// 								newConversationInbox.save()
// 									.then(newInbox => {
// 										saveConversationMessages(_messages, newInbox, _customer, helper);
// 									})
// 							}
// 						}
// 					})
// 					.catch(err => {
// 						console.log('updateInbox', err);
// 					})
// 			}
// 		})
// };

const updateInbox = (mongoose, value, page_fb_id, service, helper) => {
    let Inbox = mongoose.model("Inbox");
    let WaitMessage = mongoose.model("WaitMessage");
    let Page = mongoose.model("Page");
    let Customer = mongoose.model("Customer");
    let thread_id = value.thread_id;
    let _page;
    let _inbox;
    let _conversation;
    let _customer;
    let _customerModel;
    let _messages;
    let _matchMessage;
    let _firstMessage;

    Inbox.findOne({thread_id: thread_id, page_fb_id: page_fb_id})
        .populate('customer')
        .then(inbox => {
            _inbox = inbox;

            Page.findOne({fb_id: page_fb_id})
                .then(page => {
                    if (!page) throw new Error('Not found page-server');

                    _page = page;
                    return service.fbInboxCrawl.getConversation(thread_id, page.fb_access_token, service);
                })
                .then(conversation => {
                    _conversation = conversation;
                    if (_conversation.messages && _conversation.messages.data) {
                        let messages = _conversation.messages.data;
                        _customer = conversation.participants.data.find(participant => participant.id !== page_fb_id);
                        _customer.alias = utils.createAliasNameCustomer(_customer.name);
                        return Promise.resolve(messages);
                    } else {
                        throw new Error('Message data not found');
                    }
                })
                // match app_id && page_id of fb user
                .then(messages => {
                    _messages = messages;
                    _firstMessage = _messages[0];
                })
                .then(() => {
                    // save customer info
                    return Customer.updateCustomer(page_fb_id, _customer.id, _customer.name, _customer.alias, {email: _customer.email});
                })
                .then(customerModel => {
                    _customerModel = customerModel;
                })
                .then(() => {
                    if (_inbox) {
                        saveConversationMessages(_messages, _inbox, _customer, helper, service)
                            .then(savedMessages => {
                                console.log('savedMessages', savedMessages.length);
                                if (savedMessages.length > 0) {
                                    _inbox.snippet = savedMessages[0].message;
                                    _inbox.is_seen = false;
                                    _inbox.updated_time = new Date();
                                    _inbox.save()
                                        .then(inbox => {
                                            savedMessages.reverse();
                                            savedMessages.forEach(message => {
                                                console.log('send to client', message.message);
                                                utils.sendMessageToClient(message.toJSON(), inbox.toJSON(), helper);
                                            })
                                        })
                                }
                            })
                    } else {
                        // insert new _inbox => insert msg to _inbox => send to client
                        let newConversationInbox = new Inbox({
                            thread_id: _conversation.id,
                            snippet: _firstMessage.message,
                            link: _conversation.link,
                            can_reply: _conversation.can_reply,
                            customer_alias: _customer.alias,
                            customer: _customerModel,
                            page_fb_id: page_fb_id,
                            is_seen: false,
                            updated_time: Date.now()
                        });

                        newConversationInbox.save()
                            .then(newInbox => {
                                saveConversationMessages(_messages, newInbox, _customer, helper, service)
                                    .then(savedMessages => {
                                        savedMessages.reverse();
                                        savedMessages.forEach(message => {
                                            utils.sendMessageToClient(message.toJSON(), newInbox.toJSON(), helper);
                                        })
                                    })
                            })
                    }
                })
                .catch(err => {
                    console.log('updateInbox', err);
                })
        })
};

// const matchMessage = (messages, page-server, helper, times = 0) => {
// 	console.log('match message times: ', times + 1);
// 	const WaitMessage = helper.mongoose.model('WaitMessage');
// 	const messageIds = messages.map(message => message.id).map(m_mid => m_mid.substring(2));
//
// 	let condition = {
// 		$and: [
// 			{
// 				page_fb_id: page-server.fb_id
// 			},
// 			{
// 				fb_id: {
// 					$in: messageIds
// 				}
// 			}
// 		]
// 	}
//
// 	return WaitMessage.findOne(condition)
// 		.then(message => {
// 			if (message) {
// 				return Promise.resolve(message);
// 			} else if (times < 3) {
// 				return utils.delay(MATCH_RETRY_TIME)
// 					.then(() => matchMessage(messages, page-server, helper, times + 1));
// 			} else {
// 				return Promise.resolve(null);
// 			}
// 		})
// }

const saveConversationMessages = (messages, inbox, customer, helper, service) => {
    const Message = helper.mongoose.model('Message');
    const savedMessages = [];
    let savedPromise;

    messages.reduce((total, message, index) => {
        const from = {...message.from};
        from.fb_id = from.id;
        delete from.id;
        let newAttachments = null;
        if (message.attachments && message.attachments.data) {
            newAttachments = service.parser.parseAttachments(message.attachments.data);
        }
        const newMessage = new Message({
            fb_id: message.id.substring(2),
            inbox: inbox,
            page_fb_id: inbox.page_fb_id,
            message: message.message,
            from: from,
            attachments: newAttachments,
            shares: message.shares ? message.shares.data : null,
            updated_time: message.created_time
        });

        const promise = total.then(savedMessage => {
            if (savedMessage) {
                savedMessages.push(savedMessage);
                console.log('saved message', index + 1, '/', messages.length);
                console.log('===========================')
                //utils.sendMessageToClient(savedMessage.toJSON(), inbox.toJSON(), helper);
            }

            return newMessage.save();
        });

        if (index === messages.length - 1) {
            const errPromise = promise.catch(err => console.log('Interupt'));
            savedPromise = errPromise;
            return errPromise;
        }

        return promise;
    }, Promise.resolve());

    return savedPromise.then(() => Promise.resolve(savedMessages));
};

// const handleMessageEvent = (event, helper) => {
// 	const Page = helper.mongoose.model('Page');
// 	const Customer = helper.mongoose.model('Customer');
// 	const Message = helper.mongoose.model('Message');
// 	const WaitMessage = helper.mongoose.model('WaitMessage');
// 	const Inbox = helper.mongoose.model('Inbox');
// 	let senderId = event.sender.id; // equals to p_id (page-server-scope id)
// 	let pageId = event.recipient.id;
// 	let fbMessage = event.message;
// 	let _page;
//
// 	Page.findOne({fb_id: pageId})
// 		.then(page-server => {
// 			if (!page-server) throw new Error('not found page-server');
//
// 			_page = page-server;
// 			return Inbox.findOne({p_id: senderId})
// 				.populate('customer')
// 		})
// 		.then(inbox => {
// 			if (inbox && inbox.p_id && inbox.thread_id) {
// 				// save msg to db and send it to client
// 				const customer = inbox.toJSON().customer;
// 				const from = {};
// 				from.fb_id = customer.fb_id;
// 				from.email = customer.email;
// 				from.name = customer.name;
//
// 				const message = new Message({
// 					fb_id: fbMessage.mid,
// 					inbox: inbox,
// 					page_fb_id: _page.fb_id,
// 					message: fbMessage.text,
// 					from: from,
// 					// from: inbox.toJSON().customer,
// 					//attachments
// 					updated_time: new Date(event.timestamp)
// 				})
//
// 				inbox.updated_time = new Date(event.timestamp);
// 				inbox.snippet = fbMessage.text;
// 				inbox.save();
// 				message.save()
// 					.then(newMessage => {
// 						utils.sendMessageToClient(newMessage.toJSON(), inbox.toJSON(), helper);
// 					})
// 			} else {
// 				let waitMessage = new WaitMessage({
// 					fb_id: fbMessage.mid,
// 					p_id: senderId,
// 					page_fb_id: _page.fb_id,
// 					message: fbMessage.text,
// 					// from: _.clone(inbox.customer),
// 					//attachments
// 					updated_time: new Date(event.timestamp)
// 				})
//
// 				// push message to wait queue
// 				waitMessage.save();
// 			}
// 		})
// }


let checkHideCmt = (mongoose, post_fb_id, comment_fb_id, access_token, service) => {
    let Post = mongoose.model("Post");

    return Post.findByFbId(post_fb_id)
        .then((post) => {
            if (_.isEmpty(post)) throw new Error("Not found post");
            if (post.hide_comment === true) {
                return service.comment.hideCmtAPI(comment_fb_id, access_token, service);
            }
            else {
                return service.comment.unHideCmtAPI(comment_fb_id, access_token, service);
            }
        });
};


let queryUserInfoMessenger = (p_id, access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/${p_id}?access_token=${access_token}`;
    return apiSender.get(url);
};
