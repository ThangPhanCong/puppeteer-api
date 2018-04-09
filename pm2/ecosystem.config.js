const config = {
    apps: getApps()
};

function getApps() {
    const NUMBER_OF_APPS = process.env.NUMBER_OF_APPS;
    const NODE_ENV = process.env.NODE_ENV;
    const BASE_PORT = process.env.BASE_PORT;
    const apps = [];

    for (let i = 0; i < NUMBER_OF_APPS; i++) {
        const app = {
            name: "ads-api" + "-" + NODE_ENV + "-" + i,
            script: "index.js",
            watch: false,
            env: {
                "NODE_ENV": NODE_ENV,
                "PORT": parseInt(BASE_PORT) + i
            },
            exec_mode: "folk"
        };

        apps.push(app);
    }

    return apps;
}

module.exports = config;
