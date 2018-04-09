"use strict";

let _ = require("lodash");

class Response {
    constructor(data = null, msg = "", err = false, code = 200) {
        this.code = code;
        this.err = err;
        this.msg = msg;
        this.data = data;
    }

    undefined() {
        this.err = true;
        this.code = 400;
        this.msg = this.msg || "Something went wrong!";
        return this;
    }

    success(data) {
        this.err = false;
        this.msg = "Success";
        this.data = this.data || data || null;
        return this;
    }

    fail(msg, code) {
        this.err = true;
        this.code = code || 400;
        this.msg = this.msg || msg || "Fail";
        return this;
    }

    code(code) {
        this.code = code;
        return this;
    }
}

module.exports = (data, msg, err, code) => {
    return new Response(data, msg, err, code);
};
