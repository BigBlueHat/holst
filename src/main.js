const PouchDB = require('pouchdb');
const Vue = require('vue');

Vue.config.debug = true;

const DocLink = require('./DocLink.vue');

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
    DocLink
  },
  data: {
    new_doc_name: '',
    url: '',
    doc: {
      _id: ''
    },
    ids: {},
    remote: {
      url: '',
      username: '',
      password: ''
    },
    showSyncForm: false
  },
  computed: {
    auth() {
      if (this.remote.user !== '' && this.remote.password !== '') {
        return {
          auth: {
            user: this.remote.user,
            password: this.remote.password
          }
        };
      }
      return {};
    },
    jsonDoc: {
      get() {
        return JSON.stringify(this.doc, null, '  ');
      },
      set(value) {
        this.doc = JSON.parse(value);
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
            self.ids[resp.rows[i].key] = { revs: [resp.rows[i].value.rev] };
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
            // TODO: not sure why revs is an array...
            self.ids[resp.id].revs = [resp.rev];
          }
        });
      // TODO: handle errors and stuff
    },
    deleteDoc() {
      db.remove(this.doc);
      // TODO: handle errors
      this.confirmDelete = false;
      this.doc = {
        _id: ''
      };
      this.listDocs();
    },
    syncTo() {
      const self = this;
      // TODO: maybe do some validation or something
      const remote = new PouchDB(self.remote.url, this.auth);
      db.sync(remote)
        .on('complete', (info) => {
          console.info('sync info', info);
          alert('woot!');
          self.showSyncForm = false;
          self.listDocs();
        })
        .on('error', console.error);
    },
    showSyncFormStyles() {
      return this.showSyncForm ? 'display: flex !important' : '';
    }
  }
});
