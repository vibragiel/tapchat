// Generated by CoffeeScript 1.3.3
(function() {
  var BacklogDB, CoffeeScript, Config, Fs, Path, Sqlite3, Squel, compact, count, del, ends, extend, flatten, last, merge, starts, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Path = require('path');

  Fs = require('fs');

  Squel = require('squel');

  Sqlite3 = require('sqlite3').verbose();

  _ = require('underscore');

  Config = require('./config');

  CoffeeScript = require('coffee-script');

  _ref = CoffeeScript.helpers, starts = _ref.starts, ends = _ref.ends, compact = _ref.compact, count = _ref.count, merge = _ref.merge, extend = _ref.extend, flatten = _ref.flatten, del = _ref.del, last = _ref.last;

  BacklogDB = (function() {

    function BacklogDB(engine, callback) {
      this.createTables = __bind(this.createTables, this);

      var _this = this;
      this.file = Path.join(Config.getDataDirectory(), 'backlog.db');
      this.db = new Sqlite3.Database(this.file, function() {
        return _this.createTables(callback);
      });
    }

    BacklogDB.prototype.createTables = function(callback) {
      var statements,
        _this = this;
      statements = ["CREATE TABLE IF NOT EXISTS connections (\n    cid          INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,\n    name         TEXT     NOT NULL,\n    server       TEXT     NOT NULL,\n    port         INTEGER  NOT NULL,\n    is_ssl       BOOLEAN  NOT NULL,\n    nick         TEXT     NOT NULL,\n    user_name    TEXT     NOT NULL,\n    real_name    TEXT     NOT NULL,\n    auto_connect BOOLEAN  NOT NULL DEFAULT 1,\n    created_at   DATETIME DEFAULT (strftime('%s','now')),\n    updated_at   DATETIME\n);", "CREATE TABLE IF NOT EXISTS buffers (\n    bid           INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,\n    cid           INTEGER  NOT NULL,\n    name          TEXT     NOT NULL,\n    type          TEXT     NOT NULL,\n    archived      BOOLEAN  NOT NULL DEFAULT 0,\n    auto_join     BOOLEAN,\n    last_seen_eid INTEGER,\n    created_at    DATETIME DEFAULT (strftime('%s','now')),\n    updated_at    DATETIME\n);", "CREATE TABLE IF NOT EXISTS events (\n    eid        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,\n    bid        INTEGER  NOT NULL,\n    data       TEXT     NOT NULL,\n    created_at DATETIME DEFAULT (strftime('%s','now'))\n);", "CREATE INDEX IF NOT EXISTS connections_name ON connections (name);", "CREATE INDEX IF NOT EXISTS events_bid ON events (bid);"];
      return this.db.serialize(function() {
        var sql, _i, _len, _results;
        count = statements.length;
        _results = [];
        for (_i = 0, _len = statements.length; _i < _len; _i++) {
          sql = statements[_i];
          _results.push(_this.db.run(sql, function(err) {
            count--;
            if (err) {
              throw err;
            }
            if (count === 0) {
              return callback();
            }
          }));
        }
        return _results;
      });
    };

    BacklogDB.prototype.selectConnections = function(callback) {
      return this.db.all('SELECT * FROM connections', function(err, rows) {
        if (err) {
          throw err;
        }
        return callback(rows);
      });
    };

    BacklogDB.prototype.selectConnection = function(cid, callback) {
      return this.db.get('SELECT * FROM connections WHERE cid = $cid', {
        $cid: cid
      }, function(err, row) {
        if (err) {
          throw err;
        }
        return callback(row);
      });
    };

    BacklogDB.prototype.getBuffers = function(cid, callback) {
      return this.db.all('SELECT * FROM buffers WHERE cid = $cid', {
        $cid: cid
      }, function(err, rows) {
        if (err) {
          throw err;
        }
        return callback(rows);
      });
    };

    BacklogDB.prototype.insertConnection = function(options, callback) {
      var self;
      if (_.isEmpty(options.hostname)) {
        throw 'hostname is required';
      }
      if (!(parseInt(options.port) > 0)) {
        throw 'port is required';
      }
      if (_.isEmpty(options.nickname)) {
        throw 'nickname is required';
      }
      if (_.isEmpty(options.realname)) {
        throw 'realname is required';
      }
      self = this;
      return this.db.run("INSERT INTO connections (name, server, port, is_ssl, nick, user_name, real_name)\nVALUES ($name, $server, $port, $is_ssl, $nick, $user_name, $real_name)", {
        $name: options.hostname,
        $server: options.hostname,
        $port: options.port,
        $nick: options.nickname,
        $user_name: options.nickname,
        $real_name: options.realname,
        $is_ssl: options.ssl || false
      }, function(err) {
        if (err) {
          throw err;
        }
        return self.selectConnection(this.lastID, function(row) {
          return callback(row);
        });
      });
    };

    BacklogDB.prototype.updateConnection = function(cid, options, callback) {
      var isSSL, self, setAttribute, sql,
        _this = this;
      self = this;
      sql = Squel.update().table('connections');
      sql.where('cid = $cid');
      setAttribute = function(name, value) {
        if (value) {
          return sql.set(name, value);
        }
      };
      setAttribute('name', options.hostname);
      setAttribute('server', options.hostname);
      setAttribute('port', options.port);
      setAttribute('nick', options.nickname);
      setAttribute('user_name', options.nickname);
      setAttribute('real_name', options.realname);
      isSSL = options.ssl ? 1 : 0;
      sql.set('is_ssl', isSSL);
      return this.db.run(sql.toString(), {
        $cid: cid
      }, function(err) {
        if (err) {
          throw err;
        }
        return self.selectConnection(cid, function(row) {
          return callback(row);
        });
      });
    };

    BacklogDB.prototype.deleteConnection = function(cid, callback) {
      return this.db.run("DELETE FROM connections WHERE cid = $cid", {
        $cid: cid
      }, function(err) {
        if (err) {
          throw err;
        }
        if (!this.changes) {
          throw "Didn't find connection";
        }
        return callback();
      });
    };

    BacklogDB.prototype.insertBuffer = function(cid, name, type, callback) {
      var autoJoin;
      autoJoin = type === 'channel';
      return this.db.run('INSERT INTO buffers (cid, name, type, auto_join) VALUES ($cid, $name, $type, $auto_join)', {
        $cid: cid,
        $name: name,
        $type: type,
        $auto_join: autoJoin
      }, function(err) {
        if (err) {
          throw err;
        }
        return callback({
          cid: cid,
          bid: this.lastID,
          name: name,
          type: type
        });
      });
    };

    BacklogDB.prototype.insertEvent = function(event, callback) {
      var query;
      query = "INSERT INTO events (bid, data)\nVALUES ($bid, $data)";
      return this.db.run(query, {
        $bid: event.bid,
        $data: JSON.stringify(event)
      }, function(err) {
        if (err) {
          throw err;
        }
        return callback(merge({
          eid: this.lastID
        }, event));
      });
    };

    BacklogDB.prototype.selectEvents = function(bid, callback) {
      var query;
      query = "SELECT eid, bid, data, created_at\nFROM events\nWHERE eid IN (\n    SELECT eid\n    FROM EVENTS\n    WHERE bid = $bid\n    ORDER BY eid DESC\n    LIMIT $limit\n)\nORDER BY eid ASC";
      return this.db.all(query, {
        $bid: bid,
        $limit: 50
      }, function(err, rows) {
        if (err) {
          throw err;
        }
        return callback(rows);
      });
    };

    return BacklogDB;

  })();

  module.exports = BacklogDB;

}).call(this);