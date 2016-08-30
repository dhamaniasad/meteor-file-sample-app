myData = FileCollection({
  resumable: true,
  resumableIndexName: 'test',
  http: [
    {
      method: 'get',
      path: '/md5/:md5',
      lookup: function(params, query) {
        return {
          md5: params.md5
        };
      }
    }
  ]
});

if (Meteor.isClient) {
  Template.collTest.onRendered(function() {
    myData.resumable.assignDrop($('.fileDrop'));
  });
  Meteor.startup(function() {
    myData.resumable.on('fileAdded', function(file) {
      Session.set(file.uniqueIdentifier, 0);
      return myData.insert({
        _id: file.uniqueIdentifier,
        filename: file.fileName,
        contentType: file.file.type
      }, function(err, _id) {
        if (err) {
          console.warn("File creation failed!", err);
          return;
        }
        return myData.resumable.upload();
      });
    });
    myData.resumable.on('fileProgress', function(file) {
      return Session.set(file.uniqueIdentifier, Math.floor(100 * file.progress()));
    });
    myData.resumable.on('fileSuccess', function(file) {
      return Session.set(file.uniqueIdentifier, void 0);
    });
    return myData.resumable.on('fileError', function(file) {
      console.warn("Error uploading", file.uniqueIdentifier);
      return Session.set(file.uniqueIdentifier, void 0);
    });
  });
  Tracker.autorun(function() {
    var userId;
    userId = Meteor.userId();
    Meteor.subscribe('allData', userId);
    return $.cookie('X-Auth-Token', Accounts._storedLoginToken(), {
      path: '/'
    });
  });
  shorten = function(name, w) {
    if (w == null) {
      w = 16;
    }
    w += w % 4;
    w = (w - 4) / 2;
    if (name.length > 2 * w) {
      return name.slice(0, +w + 1 || 9e9) + '…' + name.slice(-w - 1);
    } else {
      return name;
    }
  };
  truncateId = function(id, length) {
    if (length == null) {
      length = 6;
    }
    if (id) {
      if (typeof id === 'object') {
        id = "" + (id.valueOf());
      }
      return (id.substr(0, 6)) + "…";
    } else {
      return "";
    }
  };
  Template.registerHelper("truncateId", truncateId);
  Template.collTest.events({
    'click .del-file': function(e, t) {
      if (Session.get("" + this._id)) {
        console.warn("Cancelling active upload to remove file! " + this._id);
        myData.resumable.removeFile(myData.resumable.getFromUniqueIdentifier("" + this._id));
      }
      return myData.remove({
        _id: this._id
      });
    }
  });
  Template.collTest.helpers({
    dataEntries: function() {
      return myData.find({});
    },
    shortFilename: function(w) {
      var ref;
      if (w == null) {
        w = 16;
      }
      if ((ref = this.filename) != null ? ref.length : void 0) {
        return shorten(this.filename, w);
      } else {
        return "(no filename)";
      }
    },
    owner: function() {
      var ref, ref1;
      return (ref = this.metadata) != null ? (ref1 = ref._auth) != null ? ref1.owner : void 0 : void 0;
    },
    id: function() {
      return "" + this._id;
    },
    link: function() {
      return myData.baseURL + "/md5/" + this.md5;
    },
    uploadStatus: function() {
      var percent;
      percent = Session.get("" + this._id);
      if (percent == null) {
        return "Processing...";
      } else {
        return "Uploading...";
      }
    },
    formattedLength: function() {
      return numeral(this.length).format('0.0b');
    },
    uploadProgress: function() {
      var percent;
      return percent = Session.get("" + this._id);
    },
    isImage: function() {
      var types;
      types = {
        'image/jpeg': true,
        'image/png': true,
        'image/gif': true,
        'image/tiff': true
      };
      return (types[this.contentType] != null) && this.md5 !== 'd41d8cd98f00b204e9800998ecf8427e';
    },
    loginToken: function() {
      Meteor.userId();
      return Accounts._storedLoginToken();
    },
    userId: function() {
      return Meteor.userId();
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    Meteor.publish('allData', function(clientUserId) {
      if (this.userId === clientUserId) {
        return myData.find({
          'metadata._Resumable': {
            $exists: false
          },
          'metadata._auth.owner': this.userId
        });
      } else {
        return [];
      }
    });
    Meteor.users.deny({
      update: function() {
        return true;
      }
    });
    return myData.allow({
      insert: function(userId, file) {
        var ref;
        file.metadata = (ref = file.metadata) != null ? ref : {};
        file.metadata._auth = {
          owner: userId
        };
        return true;
      },
      remove: function(userId, file) {
        var ref, ref1;
        if (((ref = file.metadata) != null ? (ref1 = ref._auth) != null ? ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      },
      read: function(userId, file) {
        var ref, ref1;
        if (((ref = file.metadata) != null ? (ref1 = ref._auth) != null ? ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      },
      write: function(userId, file, fields) {
        var ref, ref1;
        if (((ref = file.metadata) != null ? (ref1 = ref._auth) != null ? ref1.owner : void 0 : void 0) && userId !== file.metadata._auth.owner) {
          return false;
        }
        return true;
      }
    });
  });
}