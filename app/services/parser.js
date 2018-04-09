const _ = require("lodash");

exports.parseAttachments = (attachments) => {
    let newAttachments;
    newAttachments = attachments.map(attachment => {
        let attachmentCurrent = {};
        attachmentCurrent.data = [];
        /** @namespace attachment.mime_type */
        if (attachment.type) {
            if (attachment.type === "album") {
                attachmentCurrent.type = "image";
                /** @namespace attachment.subattachments */
                if (attachment.subattachments) {
                    if (Array.isArray(attachment.subattachments.data)) {
                        let data = attachment.subattachments.data.map(item => {
                            let itemCurrent = {
                                height: item.media.image.height,
                                width: item.media.image.width,
                                src: item.media.image.src,
                                description: item.description || "",
                                preview: item.media.image.preview_url || ""
                            };
                            return itemCurrent;
                        });
                        attachmentCurrent.data = data;
                    }
                }
            } else if (attachment.type === "photo" || attachment.type === "video_inline" || attachment.type === "animated_image_share" || attachment.type === "sticker") {
                if (attachment.type === "video") {
                    attachmentCurrent.type = "video";
                } else if (attachment.type === "sticker") {
                    attachmentCurrent.type = "sticker";
                } else {
                    attachmentCurrent.type = "image";
                }
                /** @namespace attachment.media.image.preview_url */
                let itemCurrent = {
                    height: attachment.media.image.height,
                    width: attachment.media.image.width,
                    src: attachment.media.image.src,
                    description: attachment.description || attachment.title || "",
                    preview: attachment.media.image.preview_url || ""
                };
                attachmentCurrent.data.push(itemCurrent);
            }
        } else if (attachment.mime_type) {
            if (/^image/.test(attachment.mime_type)) {
                attachmentCurrent.type = "image";
                /** @namespace attachment.image_data */
                let itemCurrent = {
                    height: attachment.image_data.height,
                    width: attachment.image_data.width,
                    max_height: attachment.image_data.height || attachment.image_data.height,
                    max_width: attachment.image_data.width || attachment.image_data.width,
                    src: attachment.image_data.url,
                    preview: attachment.image_data.preview_url || "",
                    name: attachment.name
                };
                attachmentCurrent.data.push(itemCurrent);
            } else if (/^video/.test(attachment.mime_type)) {
                attachmentCurrent.type = "video";
                /** @namespace attachment.video_data */
                let itemCurrent = {
                    height: attachment.video_data.height,
                    width: attachment.video_data.width,
                    preview: attachment.video_data.preview_url,
                    src: attachment.video_data.url,
                    name: attachment.name
                };
                attachmentCurrent.data.push(itemCurrent);
            } else if (/^application/.test(attachment.mime_type)) {
                attachmentCurrent.type = "application";
                /** @namespace attachment.file_url */
                let itemCurrent = {
                    src: attachment.file_url,
                    name: attachment.name
                };
                attachmentCurrent.data.push(itemCurrent);
            }
        }
        return attachmentCurrent;
    });
    return newAttachments;
};


exports.parserShares = (shares) => {
    let newShares = {};

    newShares = shares.map(share => {
        let shareCurrent = {};
        shareCurrent.type = "sticker";
        shareCurrent.data = [];
        shareCurrent.data.push({id: share.id, link: share.link});
        return shareCurrent;
    });
    return newShares;
};
