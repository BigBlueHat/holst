# Holst

Holst is an upholstry system for [Apache CouchDB](http://couchdb.apache.org)
with planetary potential.

## In a hurry?

The `build` folder should contain an up-to-date static copy of Holst
(rashly assuming I remembered to publish the updates, etc...). Open the
`build/index.html` file in a browser (or serve it with a Web server) and take notes.

## Usage

```bash
$ npm install
$ npm run styles # if this is your first time or you're updating Semantic-UI
$ npm run build
$ npm run serve
```

Open `http://localhost:8080/`. You can then enter the URL of your PouchDB or
CouchDB database in the header and get to work!

### Ugh...CORS...

```
$ npm install -g add-cors-to-couchdb
$ add-cors-to-couchdb http://localhost:5984 -u USER -p PASS
```
(obviously replace USER & PASS with something meaningful)

That will enable CORS on a CouchDB configuration compliant server.

## License

Apache License 2.0
