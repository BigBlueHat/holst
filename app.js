let db = new PouchDB('holst'); // !!! only temporary...changes to actual db
window.db = db;

function holst() {
  let cm = {}; // future CodeMirror instance
  return {
    new_doc_name: '',
    url: 'http://localhost:5984/holst',
    doc_id: '',
    doc_rev: '',
    doc_attachments: {},
    doc: {}, // the doc without the underscores
    ids: {},

    init() {
      // TODO: remove this before committing!
      this.setDBUrl();

      // setup JSON editor
      cm = CodeMirror.fromTextArea(this.$refs.codemirror, {
        matchBrackets: true,
        autoCloseBrackets: true,
        mode: "application/ld+json",
        lineWrapping: true
      });
      cm.setSize('100%', '100%');
      cm.setValue('');
    },

    setDBUrl() {
      db = new PouchDB(this.url);
      this.listDocs();
    },

    get completeDoc() {
      const underscores = { _id: this.doc_id };
      if (this.doc_rev !== '') {
        underscores._rev = this.doc_rev;
      }
      if (this.doc_attachments !== undefined && Object.keys(this.doc_attachments).length > 0) {
        underscores._attachments = this.doc_attachments;
      }
      return Object.assign(this.doc, underscores);
    },

    docEditor() {},
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
              cm.setValue(JSON.stringify(self.doc, null, 2));
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
          cm.setValue(JSON.stringify(self.doc, null, 2));
        });
    },
    saveDoc() {
      const self = this;
      // first bring content from editor to `this.doc`
      this.doc = JSON.parse(cm.getValue());
      // then put it to the database
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
    }
  };
}

function syncForm() {
  return {
    // ux
    show: false,
    // data
    username: '',
    password: '',
    url: '',
    // methods
    sync() {
      const self = this;
      const auth = (this.username !== '' && this.password !== '')
        ? {
          auth: {
            user: this.username,
            password: this.password
          }
        }
        : {};

      // TODO: maybe do some validation or something
      const remote = new PouchDB(this.url, auth);
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
}
