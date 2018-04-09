"use strict";

let async = require("async");
let request = require("request");
let _ = require("lodash");
const TIME_DELAY = 1000;
const detectPhone = /(\+?(?:(?:9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|0[0-9]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)|\((?:9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\))[0-9. -]{4,14})(?:\b|x\d+)/g;

exports.getUserInfo = (access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/me?fields=id,name,email&access_token=${access_token}`;
    return apiSender.getFb(url);
};

exports.getPagesOfUser = (fb_id, access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/${fb_id}/accounts?access_token=${access_token}`;
    return apiSender.getFb(url);
};

exports.updatePages = (userModel, pages, Page) => {
    let pageModels = [];

    return new Promise((resolve, reject) => {
        async.each(pages,
            (page, done) => {
                let page_data = {
                    name: page.name,
                    fb_id: page.id,
                    user_fb_id: userModel.fb_id,
                    fb_access_token: page.access_token,
                    category: page.category
                };

                if (page.perms.includes('ADMINISTER')) {
                    Page.updatePageInfo(page_data, userModel.fb_id)
                        .then(pageModel => {
                            pageModels.push(pageModel);
                            done();
                        })
                        .catch(err => {
                            done(err);
                        });
                } else {
                    done();
                }
            },
            (err) => {
                if (err) return reject(err);

                userModel.pages = pageModels;
                userModel.save()
                    .then(resolve)
                    .catch(reject);
            });
    });
};

exports.getArrMsgInboxes = (mongoose, inboxes) => {
    let Inbox = mongoose.model("Inbox");
    let Message = mongoose.model("Message");
    let promises = [];
    for (let inbox of inboxes) {
        if (inbox) {
            promises.push(Message.findMsg(inbox._id));
        }
    }
    return Promise.all(promises);
};

exports.getReplyCmtOfCmts = (mongoose, cmts) => {
    let Comment = mongoose.model("Comment");
    let promises = [];
    let queryNumber = 1;
    for (let cmt of cmts) {
        if (cmt) {
            promises.push(Comment.findAllRepliesCmt(cmt.fb_id, 1));
        }
    }
    return Promise.all(promises);
};

let replaceAll = (source, remove, replace) => {
    return source.split(remove).join(replace);
};

exports.getUserInfoByPid = (p_id, access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/${p_id}?access_token=${access_token}`;
    return apiSender.get(url);
};

exports.getAvatarIdOf = (appScopeUserId) => {
    return new Promise((resolve, reject) => {
        let options = {
            method: 'GET',
            uri: `https://graph.facebook.com/v2.10/${appScopeUserId}/picture`,
            followRedirect: false
        };
        request(options, (err, res, body) => {
            if (err) return reject(err);

            let avatarUrl = res.headers.location;
            let result = extractAvatarUserId(avatarUrl);
            if (result) {
                return resolve(result);
            } else {
                console.log('body', body);
                return reject('Cannot parse avatar user id ' + avatarUrl)
            }
        })
    })
};

let extractAvatarUserId = (avatarUrl) => {
    let pattern = /.+\/(.*)\.jpg/;
    if (pattern.test(avatarUrl)) {
        let groups = avatarUrl.match(pattern);
        return groups[1];
    } else {
        return null;
    }
};

exports.createAliasName = (name) => {
    let alias = replaceAll(name, " ", "").toLowerCase();
    return alias;
};

let createAliasNameCustomer = (name) => {
    if (typeof name !== 'string') return '';
    let str = name;
    str = str.toLowerCase();
    str = str.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
    str = str.replace(/[èéẹẻẽêềếệểễ]/g, "e");
    str = str.replace(/[ìíịỉĩ]/g, "i");
    str = str.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
    str = str.replace(/[ùúụủũưừứựửữ]/g, "u");
    str = str.replace(/[ỳýỵỷỹ]/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g, "");
    return str;
};

exports.checkWaitedMessageQueue = (_inbox, helper) => {
    const Message = helper.mongoose.model('Message');
    const WaitMessage = helper.mongoose.model('WaitMessage');

    setTimeout(() => {
        // check wait msg
        _inbox.populate('customer')
            .execPopulate()
            .then(inbox => {
                WaitMessage.find({p_id: inbox.p_id})
                    .then(waitMessages => {
                        console.log('wait messages', waitMessages.length);
                        waitMessages.forEach(waitMessage => {
                            const customer = inbox.toJSON().customer;
                            const from = {};
                            from.fb_id = customer.fb_id;
                            from.email = customer.email;
                            from.name = customer.name;

                            const message = new Message(waitMessage.toJSON());
                            message.inbox = inbox;
                            // message.from = inbox.toJSON().customer;
                            message.from = from;

                            waitMessage.remove();
                            return message.save()
                                .then(newMessage => {
                                    sendMessageToClient(newMessage.toJSON(), inbox.toJSON(), helper);
                                })
                        })
                    })
            })
    }, TIME_DELAY)
};

const sendMessageToClient = (message, inbox, helper) => {
    const Project = helper.mongoose.model('Project');
    const Page = helper.mongoose.model('Page');
    let data = _.clone(message);
    data.parent = _.clone(inbox);
    data.parent.type = 'inbox';

    // find project_id
    Project.findByPageFbId(inbox.page_fb_id)
        .then(projects => {
            if (projects) {
                projects.forEach(project => {
                    Page.findOne({fb_id: inbox.page_fb_id}, {fb_access_token: 0})
                        .then(page => {
                            if (page) {
                                data.parent.page = page;
                                helper.socket.sendUpdatedConversation(data, project._id);
                            }
                        })
                })
            }
        })
};

const sendCmtToClient = (cmt, helper) => {
    const Project = helper.mongoose.model('Project');
    const Page = helper.mongoose.model('Page');

    // find project_id
    Project.findByPageFbId(cmt.page_fb_id)
        .then(projects => {
            if (projects) {
                projects.forEach(project => {
                    helper.socket.sendUpdatedConversation(cmt, project._id);
                })
            }
        })

};

exports.handleErrResponse = (err, res, service, location) => {
    console.error("Error " + location, err);
    let objRes = service.response().fail(err.message);
    res.json(objRes);
};

exports.handleNextComment = (cmts, cmtOfCmts, numberQuery) => {
    let resData = {};
    let nextComment = null;
    resData.comments = [];
    resData.paging = nextComment;

    return new Promise((resolve, reject) => {
        if (cmtOfCmts) {
            if (Array.isArray(cmtOfCmts) && cmtOfCmts.length > 0) {
                if (cmts.length === numberQuery) {
                    cmts = cmts.slice(0, -1);
                    cmtOfCmts = cmtOfCmts.slice(0, -1);
                    nextComment = cmts[cmts.length - 1].updated_time;
                    nextComment = nextComment.getTime();
                    resData.paging = nextComment;
                }
            }
            let comments = cmts.map((item, i) => {
                if (cmtOfCmts[i] && Array.isArray(cmtOfCmts) && cmtOfCmts[i].length > 0) {
                    item.snippet = cmtOfCmts[i][0].message;
                }
                item.type = "comment";
                return item;
            });
            resData.comments = comments;
        }
        return resolve(resData);
    });
};

exports.handleNextInbox = (inboxes, msgsOfInbox, queryNumber) => {
    let nextInbox = null;
    let resData = {};
    resData.inboxes = [];
    resData.paging = nextInbox;

    return new Promise((resolve, reject) => {
        if (msgsOfInbox) {
            if (Array.isArray(msgsOfInbox) && msgsOfInbox.length > 0) {
                if (inboxes.length === queryNumber) {
                    inboxes = inboxes.slice(0, -1);
                    msgsOfInbox = msgsOfInbox.slice(0, -1);
                    nextInbox = inboxes[inboxes.length - 1].updated_time;
                    nextInbox = nextInbox.getTime();
                    resData.paging = nextInbox;
                }
                let inboxesMap = inboxes.map((inbox, i) => {
                    if (msgsOfInbox[i] && Array.isArray(msgsOfInbox[i]) && msgsOfInbox[i].length > 0) {
                        inbox.snippet = msgsOfInbox[i][0].message;
                    } else {
                        inbox.snippet = "";
                    }
                    inbox.type = "inbox";
                    return inbox;
                });
                resData.inboxes = inboxesMap;
            }
        }
        return resolve(resData);
    });
};

exports.delay = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time);
    })
};

exports.matchPhoneNumber = (text) => {
    return new Promise((resolve, reject) => {
        let phoneNumber = text.match(detectPhone);
        if (phoneNumber && phoneNumber.length > 0) {
            return resolve({hasPhoneNumber: true, phoneNumber: phoneNumber})
        } else {
            return resolve({hasPhoneNumber: false, phoneNumber: []})
        }
    })
};

exports.activePages = (pages, service) => {
    const promises = [];
    const successPages = [];

    pages.forEach(page => {
        const promise = service.subscribeWebhook.subscribeWebhook(page.fb_id, page.fb_access_token, service.apiSender)
            .then(body => {
                console.log('subscribeWebhook', body);
                if (body.success) {
                    successPages.push(page);
                }
            });

        promises.push(promise);
    });

    return Promise.all(promises)
        .then(() => Promise.resolve(successPages));
};

exports.extractAvatarUserId = extractAvatarUserId;
exports.createAliasNameCustomer = createAliasNameCustomer;
exports.sendMessageToClient = sendMessageToClient;
exports.sendCmtToClient = sendCmtToClient;
