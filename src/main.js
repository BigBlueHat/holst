var marked = require('marked');
var PouchDB = require('pouchdb');
var Vue = require('vue');
Vue.config.debug = true;

var db = new PouchDB('holst'); // !!! only temporary...changes to actual db
window.db = db;

window.app = new Vue({
  el: document.body,
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
    confirmDelete: false,
    showSyncForm: false
  },
  created: function() {
    var self = this;
    self.listDocs();
  },
  methods: {
    setDBUrl: function() {
      var self = this;
      console.log(self.url);
      // TODO: validate / force remote URL?
      db = new PouchDB(self.url);
      self.listDocs();
    },
    listDocs: function() {
      var self = this;
      db.allDocs()
        .then(function(resp) {
          self.ids = {};
          for (var i = 0; i < resp.rows.length; i++) {
            self.ids[resp.rows[i].key] = {revs: [resp.rows[i].value.rev]};
          }
        }
      );
    },
    newDoc: function(e) {
      var self = this;
      if (self.new_doc_name !== '') {
        self.doc._id = self.new_doc_name;
        // save the doc immediately
        db.put(self.doc)
          .then(function(resp) {
            console.log('resp', resp);
            // store the rev, so we can PUT the update later
            doc._rev = resp.rev;
            // make the new doc the current doc
            self.doc = doc;
            // reset the new doc value for future use
            self.new_doc_name = '';
            // reload the list of docs
            self.listDocs();
          }).catch(console.log.bind(console));
      } else {
        // TODO: um..yeah..error handling...
        alert('Documents need names...sorry.');
      }
    },
    loadDoc: function(e, id) {
      e.preventDefault();
      var self = this;
      db.get(id)
        .then(function(doc) {
          self.doc = doc;
        }
      );
    },
    saveDoc: function(e) {
      e.preventDefault();
      this.doc.updated = (new Date).toISOString();
      db.put(this.doc);
      // TODO: handle errors and stuff
    },
    deleteDoc: function(e) {
      e.preventDefault();
      if (this.confirmDelete) {
        db.remove(this.doc);
        // TODO: handle errors
        this.confirmDelete = false;
        this.doc = {
          _id: '',
          markdown: ''
        };
        this.listDocs();
      } else {
        this.confirmDelete = true;
      }
    },
    syncTo: function() {
      var self = this;
      // TODO: maybe do some validation or something
      var remote = new PouchDB(self.remote.url, {
        auth: {
          user: self.remote.user,
          password: self.remote.password
        }
      });
      PouchDB.sync(db, remote)
        .on('complete', function(info) {
          console.log('sync info', info);
          alert('woot!');
          self.showSyncForm = false;
          self.listDocs();
        });
    }
  }
});
