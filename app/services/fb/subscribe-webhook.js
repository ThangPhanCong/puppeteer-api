exports.subscribeWebhook = (fb_page_id, access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/${fb_page_id}/subscribed_apps?&access_token=${access_token}`;
    return apiSender.post(url);
};

exports.unSubscribeWebhook = (fb_page_id, access_token, apiSender) => {
    let url = `https://graph.facebook.com/v2.10/${fb_page_id}/subscribed_apps?&access_token=${access_token}`;
    return apiSender.deleteFb(url);
};
