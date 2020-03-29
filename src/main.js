const PouchDB = require('pouchdb-browser');
const Vue = require('vue');

Vue.config.debug = true;

const DocLink = require('./DocLink.vue');
const SyncModal = require('./SyncModal.vue');

let db = new PouchDB('holst'); // !!! only temporary...changes to actual db
window.db = db;

window.app = new Vue({
  el: '#app',
  filters: {
    json(value) {
      return JSON.parse(value, null, '  ');
    }
  },
  components: {
    DocLink,
    SyncModal
  },
  data: {
    new_doc_name: '',
    url: '',
    doc: {
      _id: ''
    },
    ids: {},
    showSyncForm: false
  },
  computed: {
    editableDoc: {
      get() {
        // TODO: consider making the app always work with a "cleaned" doc
        const temp = JSON.parse(JSON.stringify(this.doc));
        // remove _id/_rev as they are "locked"
        delete temp._id;
        delete temp._rev;
        return JSON.stringify(temp, null, '  ');
      },
      set(value) {
        const temp = JSON.parse(value);
        // put _id/_rev back
        temp._id = this.doc._id;
        temp._rev = this.doc._rev;
        this.doc = temp;
      }
    }
  },
  created() {
    this.listDocs();
  },
  methods: {
    setDBUrl() {
      // TODO: validate / force remote URL?
      db = new PouchDB(this.url);
      this.listDocs();
    },
    listDocs() {
      const self = this;
      db.allDocs()
        .then((resp) => {
          self.ids = {};
          for (let i = 0; i < resp.rows.length; i++) {
            self.ids[resp.rows[i].key] = resp.rows[i].value.rev;
          }
        });
    },
    newDoc() {
      const self = this;
      if (self.new_doc_name !== '') {
        self.doc = {
          _id: self.new_doc_name
        };
        // save the doc immediately
        db.put(self.doc)
          .then((resp) => {
            // store the _id & _rev, so we can PUT the update later
            self.doc = {
              _id: resp.id,
              _rev: resp.rev
            };
            // reset the new doc value for future use
            self.new_doc_name = '';
            // reload the list of docs
            self.listDocs();
          }).catch(console.error.bind(console));
      } else {
        // TODO: um..yeah..error handling...
        alert('Documents need names...sorry.');
      }
    },
    loadDoc(id) {
      const self = this;
      db.get(id)
        .then((doc) => {
          self.doc = doc;
        });
    },
    saveDoc() {
      const self = this;
      self.doc.updated = (new Date()).toISOString();
      db.put(self.doc)
        .then((resp) => {
          if (resp.ok) {
            self.ids[resp.id] = resp.rev;
          }
        });
      // TODO: handle errors and stuff
    },
    deleteDoc() {
      db.remove(this.doc);
      // TODO: handle errors
      this.doc = {
        _id: ''
      };
      this.listDocs();
    },
    syncTo(opts) {
      const self = this;
      const auth = (opts.user !== '' && opts.password !== '')
        ? {
          auth: {
            user: this.remote.user,
            password: this.remote.password
          }
        }
        : {};

      // TODO: maybe do some validation or something
      const remote = new PouchDB(opts.url, auth);
      db.sync(remote)
        .on('complete', (info) => {
          console.info('sync info', info);
          alert('woot!');
          self.showSyncForm = false;
          self.listDocs();
        })
        .on('error', console.error);
    }
  }
});
