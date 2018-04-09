const apiSender = require("../api-sender");
const config = require("config");
const PAGE_SERVER= config.get("url.page_server");
const secret = config.get("admin.secret");

module.exports.removeTagsOfProject = (project_id) => {
    let route = `${PAGE_SERVER}/api/p/projects/${project_id}/tags`;
    return apiSender.deletePageServer(route, secret)
        .then(response => {
            if(response && response.code == 202) {
                return Promise.resolve(response.data);
            } else {
                return Promise.reject();
            }
        })
};