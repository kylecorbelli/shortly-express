var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');


var Link = require('./link.js');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  links: function() {
    return this.hasMany(Link);
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var hash = bcrypt.hashSync(model.get('password'));
      model.set('password', hash);
      // model.set('code', shasum.digest('hex').slice(0, 5));
    });
  }
});

module.exports = User;