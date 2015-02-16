"use strict";

module.exports = {

  updates: {
    test: function (doc, req) {
      var now = new Date().toISOString();

      doc = {
        _id: req.id,
        dtcreated: doc && doc.dtcreated || now,
        dtupdated: now
      }

      var data = JSON.parse(req.body);
      Object.keys(data).forEach(function (key) {
        if (key in doc) return;
        doc[key] = data[key];
      });

      var res = {
        headers: {
          "Content-Type": "application/json"
        },
        body: toJSON(doc)
      };

      return [doc, res];
    }
  }

};
