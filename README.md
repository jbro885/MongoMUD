# MongoDB World 2016 - MUD

This project exposes a set of services required to support the MUD demonstration planned for MongoDB world 2016.

## Pre-requisites

* NodeJS (Download from https://nodejs.org/en/) - tested on 4.2.2
* A running local instance of MongoDB (hardcoded to port 27017)

## Installing

```
cd mongo-labs/mdbworld-mud
npm install
```

## Starting

```
cd mongo-labs/mdbworld-mud
node app.js
```

To start the app in single process mode, add `--dev` as a command line parameter (helpful for debugging etc).

Navigate to http://localhost:3000/login.html
A link exists to create a new user.

## Endpoints

|Verb  |URL                      |Description|
|------|-------------------------|-----------|
|POST  |/message                 |Publish a new message.  Payload should be JSON and the content-type header set to application/json|
|GET   |/message/:id             |Get an individual message by it's ID|
|DELETE|/message/:id             |Delete an individual message it's ID|
|GET   |/message?time=<timestamp>|Search for messages created since a given timestamp.  Time needs to be parsable as a date e.g. 2015-11-25T14:10:41.489Z|
