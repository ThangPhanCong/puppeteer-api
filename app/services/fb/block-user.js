"use strict";

const apiSender = require("../api-sender");

exports.block = (page_fb_id, arr_user_id, access_token) => {
    let url = `https://graph.facebook.com/v2.10/${page_fb_id}/blocked?access_token=${access_token}`;
    let payload = {
        asid: arr_user_id
    };
    return apiSender.postFb(url, payload);
};

exports.unBlock = (page_fb_id, user_id, access_token) => {
    let url = `https://graph.facebook.com/v2.10/${page_fb_id}/blocked?access_token=${access_token}`;
    let payload = {
        asid: user_id
    };

    return apiSender.deleteJSON(url, payload);
};
