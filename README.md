# Facebook manager suite server

## Tech stack
* MongoDB
* Mocha
* Express
* Facebook Graph API


## Start server
* Create `config.json` file in ${root} directory likes `config.example.json`
* `npm start`

## Run tests
* Create `config.json` file in ${root/test} directory likes `config.example.json` in /test folder (test database should be diffrent to development database)
* Add your FB_ACCCESS_TOKEN and your USER_FB_ID into `config.json`
* `npm test`