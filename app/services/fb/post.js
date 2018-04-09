"use strict";

const apiSender = require("../api-sender");

exports.uploadImages = (page_fb_id, access_token, imgs) => {
    let url = `https://graph.facebook.com/v2.10/${page_fb_id}/photos?access_token=${access_token}`;
    let promises = [];
    imgs.forEach(img => {
        let payload = {
            published: false,
            url: img
        };
        promises.push(apiSender.postFb(url, payload));
    });
    return Promise.all(promises)

};

exports.createPost = (page_fb_id, access_token, content) => {
    if (content.type === "video") {
        delete content.type;
        let url = `https://graph.facebook.com/v2.10/${page_fb_id}/videos?access_token=${access_token}`;
        return apiSender.postFb(url, content);
    } else {
        let url = `https://graph.facebook.com/v2.10/${page_fb_id}/feed?access_token=${access_token}`;
        return apiSender.postFb(url, content);
    }

};

exports.getPost = (post_fb_id, access_token, query, service) => {
    let url = `https://graph.facebook.com/v2.10/${post_fb_id}?${query}&access_token=${access_token}`;
    return service.apiSender.get(url);
};
