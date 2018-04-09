"use strict";

const apiSender = require("../api-sender");

exports.like = (cmt_fb_id, access_token) => {
    let url = `https://graph.facebook.com/v2.10/${cmt_fb_id}/likes?access_token=${access_token}`;
    return apiSender.post(url);
};

exports.unLike = (cmt_fb_id, access_token) => {
    let url = `https://graph.facebook.com/v2.10/${cmt_fb_id}/likes?access_token=${access_token}`;
    return apiSender.deleteFb(url);
};

exports.deleteCmt = (cmt_fb_id, access_token) => {
    let url = `https://graph.facebook.com/v2.10/${cmt_fb_id}?access_token=${access_token}`;
    return apiSender.deleteFb(url);
};

exports.hideCmtAPI = (comment_fb_id, access_token, service) => {
    let url = `https://graph.facebook.com/v2.10/${comment_fb_id}?is_hidden=true&access_token=${access_token}`;
    return service.apiSender.post(url);
};

exports.unHideCmtAPI = (comment_fb_id, access_token, service) => {
    let url = `https://graph.facebook.com/v2.10/${comment_fb_id}?is_hidden=false&access_token=${access_token}`;
    return service.apiSender.post(url);
};
