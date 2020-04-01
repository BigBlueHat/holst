const PouchDB = require('pouchdb-browser');
const Vue = require('vue');

Vue.config.debug = true;

const DesignDocEditor = require('./DesignDocEditor.vue');
const DocLink = require('./DocLink.vue');
const JsonEditor = require('./JsonEditor.vue');
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
    DesignDocEditor,
    DocLink,
    JsonEditor,
    SyncModal
  },
  data: {
    new_doc_name: '',
    url: '',
    doc_id: '',
    doc_rev: '',
    doc_attachments: {},
    doc: {}, // the doc without the underscores
    ids: {},
    showSyncForm: false
  },
  computed: {
    completeDoc() {
      const underscores = { _id: this.doc_id };
      if (this.doc_rev !== '') {
        underscores._rev = this.doc_rev;
      }
      if (this.doc_attachments !== undefined && Object.keys(this.doc_attachments).length > 0) {
        underscores._attachments = this.doc_attachments;
      }
      return Object.assign(this.doc, underscores);
    },
    docEditor() {
      return this.doc_id.substr(0, 8) === '_design/'
        ? 'DesignDocEditor'
        : 'JsonEditor';
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
        // save the doc immediately
        db.put({ _id: self.new_doc_name })
          .then((resp) => {
            if (resp.ok) {
              // store the _id & _rev, so we can PUT the update later
              self.doc_id = resp.id;
              self.doc_rev = resp.rev;
              self.doc = {};
              // reset the new doc value for future use
              self.new_doc_name = '';
              // reload the list of docs
              self.listDocs();
            }
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
          self.doc_id = doc._id;
          self.doc_rev = doc._rev;
          self.doc_attachments = doc._attachments;
          const tempDoc = doc;
          delete tempDoc._id;
          delete tempDoc._rev;
          delete tempDoc._attachments;
          self.doc = tempDoc;
        });
    },
    saveDoc() {
      const self = this;
      // TODO: probably should remove this auto-magic data thing
      self.doc.updated = (new Date()).toISOString();
      db.put(self.completeDoc)
        .then((resp) => {
          if (resp.ok) {
            self.ids[resp.id] = resp.rev;
            self.doc_rev = resp.rev;
          }
        });
      // TODO: handle errors and stuff
    },
    deleteDoc() {
      db.remove(this.completeDoc)
        .then((resp) => {
          if (resp.ok) {
            this.doc_id = '';
            this.doc_rev = '';
            this.listDocs();
          }
        });
      // TODO: handle errors
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
