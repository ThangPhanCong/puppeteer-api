"use strict";

const Mongoose = require("mongoose");
const Glob = require("glob");

module.exports.connect = (mongoUri) => {
    return new Promise((resolve, reject) => {
        Mongoose.Promise = global.Promise;

        Mongoose.connect(mongoUri, function (err) {
            if (err) {
                throw err;
            }
        });

        process.on("SIGINT", function () {
            Mongoose.connection.close(function () {
                console.log("Mongo Database disconnected through app termination");
                process.exit(0);
            });
        });

        Mongoose.connection.on("connected", function () {
            resolve("Mongo Database connected");
        });

        Mongoose.connection.on("disconnected", function () {
            reject(" Mongo Database disconnected");
        });

        let models = Glob.sync("app/models/*.js");
        models.forEach(function (model) {
            require("../" + model);
        });
    });
};

module.exports.close = () => {
    return new Promise((resolve, reject) => {
        Mongoose.connection.close(() => {
            resolve();
        });
    });
};

module.exports.getModel = (name) => {
    return Mongoose.model(name);
};