"use strict";

const _ = require("lodash");

let response = require("../response");
const event = require("../../socket/event");
const utils = require("../../utils");

let getPostsOfPage = (socket, mongoose, fb_page_id, access_token, query, service, next) => {
    let url = `https://graph.facebook.com/v2.10/${fb_page_id}/posts?${query}&access_token=${access_token}`;
    if (next) {
        url = next;
    }

    let _postsData = null;
    let _postModels = null;
    return service.apiSender.getFb(url)
        .then(
            postsData => {
                _postsData = postsData;

                // if (socket) {
                // 	try {
                // 		notifyClient(socket, event, response, postsData.data);
                // 	} catch (err) {
                // 		console.log("getPostsOfPage notifyClient", err.message);
                // 	}
                // }

                return savePostsIntoDb(mongoose, postsData.data, fb_page_id, service);
            }
        )
        .then(
            postModels => {
                _postModels = postModels;
            }
        )
        .then(
            () => {
                return getCmtsOfPosts(mongoose, _postModels, access_token, service);
            }
        )
        .catch(err => {
            console.log(err);
            console.log("getFb url", url);
        })
        .then(
            () => {
                if (_postsData && _postsData.paging && _postsData.paging.next) {
                    let _next = _postsData.paging.next;
                    return getPostsOfPage(socket, mongoose, fb_page_id, access_token, query, service, _next);
                } else {
                    return Promise.resolve();
                }
            }
        );
};

let savePostsIntoDb = (mongoose, posts, fb_page_id, service) => {
    if (!posts) {
        return Promise.resove();
    }
    let Post = mongoose.model("Post");
    let promises = [];
    for (let post of posts) {
        let newAttachments = null;
        if (post.attachments && post.attachments.data) {
            newAttachments = service.parser.parseAttachments(post.attachments.data);
        }
        let postModel = new Post({
            fb_id: post.id,
            page_fb_id: fb_page_id,
            message: post.message,
            created_time: post.created_time,
            updated_time: post.updated_time,
            attachments: newAttachments,
            story: post.story,
            hide_comment: false

        });
        promises.push(postModel.save());
    }
    return Promise.all(promises);
};

let getCmtsOfPosts = (mongoose, postModels, access_token, service) => {
    if (!postModels) {
        return Promise.resolve();
    }
    let promises = [];

    for (let postModel of postModels) {
        let query = "fields=comments{from,can_comment,attachment,can_hide,can_like,can_remove,can_reply_privately,message,created_time,is_hidden,is_private}";
        promises.push(getCmtsOfPost(mongoose, postModel, access_token, query, service));
    }

    return Promise.all(promises);
};

let getCmtsOfPost = (mongoose, postModel, access_token, query, service, next) => {
    let url = `https://graph.facebook.com/v2.10/${postModel.get("fb_id")}?${query}&access_token=${access_token}`;
    if (next) {
        url = next;
    }

    let cmtsData = null;
    let _cmtModels = null;
    return service.apiSender.getFb(url)
        .then(
            fbData => {
                if (fbData.comments) {
                    cmtsData = fbData.comments;
                } else {
                    cmtsData = fbData;
                }

                return saveCmtsIntoDb(mongoose, cmtsData.data, postModel.fb_id, postModel.page_fb_id, service);
            }
        )
        .then(
            cmtModels => {
                _cmtModels = cmtModels;
            }
        )
        .then(
            () => {
                return getCmtsOfPosts(mongoose, _cmtModels, access_token, service);
            }
        )
        .catch(err => {
            console.log(err);
            console.log("getFb url", url);
        })
        .then(
            () => {
                if (cmtsData && cmtsData.paging && cmtsData.paging.next) {
                    let _next = cmtsData.paging.next;
                    return getCmtsOfPost(mongoose, postModel, access_token, query, service, _next);
                } else {
                    return Promise.resolve();
                }
            }
        );
};

let saveCmtsIntoDb = (mongoose, cmts, post_fb_id, page_fb_id, service) => {
    if (!cmts) {
        return Promise.resolve();
    }

    let Comment = mongoose.model("Comment");
    let Customer = mongoose.model("Customer");
    let promises = [];

    for (let cmt of cmts) {
        let customer = null;
        let alias = null;
        let newAttachments = null;
        let from = cmt.from;
        from.fb_id = from.id;
        delete from.id;
        if (from.fb_id !== page_fb_id) {
            alias = utils.createAliasNameCustomer(cmt.from.name);
            from.alias = alias;
        }
        if (cmt.attachment) {
            newAttachments = service.parser.parseAttachments([cmt.attachment]);
        }
        let cmtModel = new Comment({
            fb_id: cmt.id,
            parent_fb_id: post_fb_id,
            page_fb_id: page_fb_id,
            message: cmt.message,
            attachments: newAttachments,
            updated_time: cmt.created_time,
            created_time: cmt.created_time,
            from: from,
            can_comment: cmt.can_comment,
            can_hide: cmt.can_hide,
            can_like: cmt.can_like,
            can_remove: cmt.can_remove,
            can_reply_privately: cmt.can_reply_privately,
            is_hidden: cmt.is_hidden,
            is_private: cmt.is_private,
            snippet: cmt.message
        });
        let promise = cmtModel.save();
        promises.push(promise);
    }

    return Promise.all(promises);
};

let updatePostIntoPage = (mongoose, page_fb_id, postModels) => {
    let Page = mongoose.model("Page");

    return Page.findByFbId(page_fb_id)
        .then((page) => {
            if (_.isEmpty(page)) return Promise.resolve();

            page.posts = page.posts.concat(postModels);
            return page.save();
        });
};

let crawlCmt = (comment_fb_id, access_token, service, query) => {
    let url = `https://graph.facebook.com/v2.10/${comment_fb_id}?${query}&access_token=${access_token}`;
    return service.apiSender.getFb(url);
};

let getCmt = (mongoose, page_fb_id, parent_fb_id, comment_fb_id, access_token, service) => {
    let query = "fields=from,can_comment,attachment,can_hide,can_like,can_remove,can_reply_privately,message,created_time,is_hidden,is_private";
    return crawlCmt(comment_fb_id, access_token, service, query)
        .then(cmt => saveCmtsIntoDb(mongoose, [cmt], parent_fb_id, page_fb_id, service));
};

let crawlPost = (post_fb_id, access_token, service, query) => {
    let url = `https://graph.facebook.com/v2.10/${post_fb_id}?${query}&access_token=${access_token}`;
    return service.apiSender.get(url);
};

let getPost = (mongoose, page_fb_id, post_fb_id, access_token, service) => {
    let query = "fields=attachments,message,id,created_time,updated_time,story";
    return crawlPost(post_fb_id, access_token, service, query)
        .then(post => savePostsIntoDb(mongoose, [post], page_fb_id, service));
};
let notifyClient = (_socket, _event, _response, posts) => {
    if (!Array.isArray(posts) || posts.length === 0) return;

    let _posts = posts.map((p) => {
        return p.message;
    });
    let data = {
        type: "post",
        items: _posts
    };

    let update = _response().success(data);
    _socket.emit(_event.ACTIVE_PAGE_UPDATE_EVENT, update);
};

exports.getPostsOfPage = getPostsOfPage;
exports.getCmtsOfPost = getCmtsOfPost;
exports.getCmt = getCmt;
exports.crawlCmt = crawlCmt;
exports.getPost = getPost;
exports.crawlPost = crawlPost;
